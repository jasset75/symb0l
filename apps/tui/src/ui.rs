use ratatui::{
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Cell, Clear, Paragraph, Row, Table},
    Frame,
};

use crate::api::{Listing, QuoteResult};
use crate::app::{App, Mode};
use crate::filter::FilterField;

// ---------------------------------------------------------------------------
// Colour palette
// ---------------------------------------------------------------------------

const C_ACCENT: Color = Color::Cyan;
const C_HEADER: Color = Color::Yellow;
const C_SELECTED: Color = Color::DarkGray;
const C_POS: Color = Color::Green;
const C_NEG: Color = Color::Red;
const C_DIM: Color = Color::Gray;
const C_ERROR: Color = Color::Red;
const C_QUOTES_BADGE: Color = Color::LightGreen;
const C_BROWSE_BADGE: Color = Color::Blue;

// ---------------------------------------------------------------------------
// Main render entry point
// ---------------------------------------------------------------------------

pub fn render(frame: &mut Frame, app: &mut App) {
    let area = frame.area();

    // Vertical split: header | table | footer
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3), // header
            Constraint::Min(5),    // table
            Constraint::Length(3), // footer
        ])
        .split(area);

    render_header(frame, app, chunks[0]);
    render_table(frame, app, chunks[1]);
    render_footer(frame, app, chunks[2]);

    // Modal filter panel (drawn on top)
    if app.editing {
        render_filter_panel(frame, app, area);
    }
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

fn render_header(frame: &mut Frame, app: &App, area: Rect) {
    let mode_badge = match app.mode {
        Mode::Browse => Span::styled(
            " BROWSE ",
            Style::default()
                .fg(Color::Black)
                .bg(C_BROWSE_BADGE)
                .add_modifier(Modifier::BOLD),
        ),
        Mode::Quotes => Span::styled(
            " QUOTES ⟳ ",
            Style::default()
                .fg(Color::Black)
                .bg(C_QUOTES_BADGE)
                .add_modifier(Modifier::BOLD),
        ),
    };

    let loading_span = if app.loading {
        Span::styled(" loading… ", Style::default().fg(C_DIM).add_modifier(Modifier::ITALIC))
    } else {
        let secs = app.last_refresh.elapsed().as_secs();
        let refresh_text = if secs < 5 {
            " just now ".to_string()
        } else {
            format!(" {}s ago ", secs)
        };
        Span::styled(refresh_text, Style::default().fg(C_DIM))
    };

    let error_span = if let Some(ref e) = app.error {
        Span::styled(format!(" ⚠ {e} "), Style::default().fg(C_ERROR))
    } else {
        Span::raw("")
    };

    let title = Line::from(vec![
        Span::styled(
            " symb0l-tui ",
            Style::default().fg(C_ACCENT).add_modifier(Modifier::BOLD),
        ),
        mode_badge,
        loading_span,
        error_span,
    ]);

    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(C_ACCENT));

    let para = Paragraph::new(title)
        .block(block)
        .alignment(Alignment::Left);

    frame.render_widget(para, area);
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

fn render_table(frame: &mut Frame, app: &mut App, area: Rect) {
    let show_quotes = app.mode == Mode::Quotes;

    // Column widths: Percentage of total terminal width.
    // Responsive (scales with terminal size) and implicitly capped
    // — no column can exceed its percentage share.
    let constraints = if show_quotes {
        vec![
            Constraint::Percentage(8),  // Ticker
            Constraint::Percentage(28), // Name
            Constraint::Percentage(20), // Sector
            Constraint::Percentage(17), // Profile
            Constraint::Percentage(17), // Price
            Constraint::Percentage(10), // Chg%
        ]
    } else {
        vec![
            Constraint::Percentage(10), // Ticker
            Constraint::Percentage(33), // Name
            Constraint::Percentage(22), // Sector
            Constraint::Percentage(20), // Profile
            Constraint::Percentage(15), // Type
        ]
    };

    let header_cells: Vec<Cell> = if show_quotes {
        ["Ticker", "Name", "Sector", "Profile", "Price", "Chg%"]
            .iter()
            .map(|h| {
                Cell::from(*h).style(
                    Style::default()
                        .fg(C_HEADER)
                        .add_modifier(Modifier::BOLD),
                )
            })
            .collect()
    } else {
        ["Ticker", "Name", "Sector", "Profile", "Type"]
            .iter()
            .map(|h| {
                Cell::from(*h).style(
                    Style::default()
                        .fg(C_HEADER)
                        .add_modifier(Modifier::BOLD),
                )
            })
            .collect()
    };

    let header = Row::new(header_cells).height(1).bottom_margin(1);

    let rows: Vec<Row> = app
        .listings
        .iter()
        .map(|l| listing_to_row(l, show_quotes))
        .collect();

    let count_label = format!(" {} symbol(s) ", app.listings.len());
    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(C_DIM))
        .title(Span::styled(count_label, Style::default().fg(C_DIM)));

    let table = Table::new(rows, constraints)
        .header(header)
        .block(block)
        .row_highlight_style(
            Style::default()
                .bg(C_SELECTED)
                .add_modifier(Modifier::BOLD),
        )
        .highlight_symbol("▶ ");

    frame.render_stateful_widget(table, area, &mut app.table_state);
}

fn listing_to_row(l: &Listing, show_quotes: bool) -> Row<'static> {
    let symbol = l.symbol_code.clone();
    let name = truncate(&l.instrument_name, 28);
    let sector = truncate(&l.sector, 14);
    let profile = truncate(&l.profile, 11);

    if show_quotes {
        let (price_str, chg_str, chg_style) = quote_cells(l);
        Row::new(vec![
            Cell::from(symbol).style(Style::default().fg(C_ACCENT).add_modifier(Modifier::BOLD)),
            Cell::from(name),
            Cell::from(sector).style(Style::default().fg(C_DIM)),
            Cell::from(profile),
            Cell::from(price_str),
            Cell::from(chg_str).style(chg_style),
        ])
    } else {
        let typ = truncate(&l.instrument_type, 10);
        Row::new(vec![
            Cell::from(symbol).style(Style::default().fg(C_ACCENT).add_modifier(Modifier::BOLD)),
            Cell::from(name),
            Cell::from(sector).style(Style::default().fg(C_DIM)),
            Cell::from(profile),
            Cell::from(typ).style(Style::default().fg(C_DIM)),
        ])
    }
}

fn quote_cells(l: &Listing) -> (String, String, Style) {
    match &l.quote {
        Some(QuoteResult::Success { data: q }) => {
            let price = q
                .price
                .map(|p| format!("{:.2} {}", p, q.currency.as_deref().unwrap_or("")))
                .unwrap_or_else(|| "-".to_string());
            let (chg, style) = match q.percent_change {
                Some(pc) if pc > 0.0 => (
                    format!("{:+.2}%", pc),
                    Style::default().fg(C_POS).add_modifier(Modifier::BOLD),
                ),
                Some(pc) if pc < 0.0 => (
                    format!("{:.2}%", pc),
                    Style::default().fg(C_NEG).add_modifier(Modifier::BOLD),
                ),
                Some(pc) => (format!("{:.2}%", pc), Style::default()),
                None => ("-".to_string(), Style::default()),
            };
            (price, chg, style)
        }
        Some(QuoteResult::Error { error: e }) => (
            "-".to_string(),
            format!("err:{}", e.code),
            Style::default().fg(C_ERROR),
        ),
        Some(QuoteResult::NotFound) | None => (
            "-".to_string(),
            "-".to_string(),
            Style::default().fg(C_DIM),
        ),
    }
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

fn render_footer(frame: &mut Frame, app: &App, area: Rect) {
    let hints: Vec<Span> = match (app.editing, app.mode) {
        (true, _) => vec![
            key("[Tab]"), txt(" next field  "),
            key("[Enter]"), txt(" search  "),
            key("[Esc]"), txt(" cancel"),
        ],
        (false, Mode::Browse) => vec![
            key("[f]"), txt(" filter  "),
            key("[Space]"), txt(" load quotes  "),
            key("[↑↓]"), txt(" navigate  "),
            key("[q]"), txt(" quit"),
        ],
        (false, Mode::Quotes) => vec![
            key("[f]"), txt(" filter  "),
            key("[Space]"), txt(" stop quotes  "),
            key("[r]"), txt(" refresh  "),
            key("[↑↓]"), txt(" navigate  "),
            key("[q]"), txt(" quit"),
        ],
    };

    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(C_DIM));

    let para = Paragraph::new(Line::from(hints))
        .block(block)
        .alignment(Alignment::Center);

    frame.render_widget(para, area);
}

fn key(s: &str) -> Span<'static> {
    Span::styled(
        s.to_owned(),
        Style::default()
            .fg(C_ACCENT)
            .add_modifier(Modifier::BOLD),
    )
}
fn txt(s: &str) -> Span<'static> {
    Span::raw(s.to_owned())
}

// ---------------------------------------------------------------------------
// Filter panel (modal overlay)
// ---------------------------------------------------------------------------

fn render_filter_panel(frame: &mut Frame, app: &App, area: Rect) {
    // Centre a fixed-size box over the terminal.
    let popup_width = 58u16;
    let popup_height = 10u16;
    let x = area.x + area.width.saturating_sub(popup_width) / 2;
    let y = area.y + area.height.saturating_sub(popup_height) / 2;
    let popup_area = Rect::new(x, y, popup_width.min(area.width), popup_height.min(area.height));

    // Clear the background cell by cell so the modal stands out.
    frame.render_widget(Clear, popup_area);

    let block = Block::default()
        .title(Span::styled(
            " Filtros ",
            Style::default().fg(C_ACCENT).add_modifier(Modifier::BOLD),
        ))
        .borders(Borders::ALL)
        .border_style(Style::default().fg(C_ACCENT));

    frame.render_widget(block.clone(), popup_area);

    // Inner area for the fields.
    let inner = popup_area.inner(ratatui::layout::Margin {
        horizontal: 2,
        vertical: 1,
    });

    let field_rows = Layout::default()
        .direction(Direction::Vertical)
        .constraints(vec![Constraint::Length(1); FilterField::ALL.len() + 1])
        .split(inner);

    for (i, &field) in FilterField::ALL.iter().enumerate() {
        let label = format!("{:8}: ", field.label());
        let value = match field {
            crate::filter::FilterField::SymbolCode => &app.filter.symbol_code,
            crate::filter::FilterField::InstrumentName => &app.filter.instrument_name,
            crate::filter::FilterField::Sector => &app.filter.sector,
            crate::filter::FilterField::Profile => &app.filter.profile,
        };
        let cursor = if i == app.filter.active { "▌" } else { " " };
        let is_active = i == app.filter.active;

        let fg = if is_active { C_ACCENT } else { C_DIM };
        let line = Line::from(vec![
            Span::styled(label, Style::default().fg(fg)),
            Span::styled(
                format!("{value}{cursor}"),
                if is_active {
                    Style::default().add_modifier(Modifier::UNDERLINED)
                } else {
                    Style::default().fg(C_DIM)
                },
            ),
        ]);

        if i < field_rows.len() {
            frame.render_widget(Paragraph::new(line), field_rows[i]);
        }
    }

    // Hint row
    if let Some(hint_area) = field_rows.last() {
        let hint = Line::from(vec![
            key("[Enter]"),
            txt(" Buscar  "),
            key("[Tab]"),
            txt(" Sig. campo  "),
            key("[Esc]"),
            txt(" Cancelar"),
        ]);
        frame.render_widget(Paragraph::new(hint), *hint_area);
    }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

fn truncate(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        s.to_string()
    } else {
        let truncated: String = s.chars().take(max.saturating_sub(1)).collect();
        format!("{truncated}…")
    }
}
