mod api;
mod app;
mod event;
mod filter;
mod ui;

use std::time::Duration;

use clap::Parser;
use color_eyre::eyre::Result;
use crossterm::{
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{backend::CrosstermBackend, Terminal};

use crate::{
    api::ApiClient,
    app::App,
    event::{AppEvent, EventHandler, is_quit},
};

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

/// Symb0l TUI — browse and track financial symbols from your terminal.
#[derive(Parser, Debug)]
#[command(name = "symb0l-tui", version, about)]
struct Cli {
    /// Base URL of the Symb0l API (e.g. http://localhost:3000).
    #[arg(long, default_value = "http://localhost:3000")]
    api_url: String,

    /// Auto-refresh interval in seconds when Quotes mode is active.
    /// Minimum enforced: 15 s (TwelveData free-tier: 8 req/min).
    #[arg(long, default_value_t = 60)]
    refresh: u64,
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

#[tokio::main]
async fn main() -> Result<()> {
    color_eyre::install()?;

    let cli = Cli::parse();
    let refresh_secs = cli.refresh.max(15); // enforce minimum

    // ------------------------------------------------------------------
    // Terminal setup
    // ------------------------------------------------------------------
    enable_raw_mode()?;
    let mut stdout = std::io::stdout();
    execute!(stdout, EnterAlternateScreen)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    // Restore terminal even if we panic.
    let hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let _ = disable_raw_mode();
        let _ = execute!(std::io::stderr(), LeaveAlternateScreen);
        hook(info);
    }));

    // ------------------------------------------------------------------
    // App & event handler
    // ------------------------------------------------------------------
    let client = ApiClient::new(&cli.api_url);
    let mut app = App::new(client, Duration::from_secs(refresh_secs));
    // Tick every second — just for refresh-check granularity, not per-request.
    let mut events = EventHandler::new(Duration::from_secs(1));

    // Initial load (Browse mode, free).
    app.fetch(false).await;
    if app.listings.is_empty() && app.error.is_none() {
        // Nothing to select yet; keep selection at None.
    } else if !app.listings.is_empty() {
        app.table_state.select(Some(0));
    }

    // ------------------------------------------------------------------
    // Event loop
    // ------------------------------------------------------------------
    loop {
        terminal.draw(|frame| ui::render(frame, &mut app))?;

        match events.next().await {
            None => break,

            Some(AppEvent::Tick) => {
                app.on_tick().await;
            }

            Some(AppEvent::Resize) => {
                // Ratatui redraws automatically on next draw call.
            }

            Some(AppEvent::Key(key)) => {
                // --- Filter panel open ---
                if app.editing {
                    use crossterm::event::KeyCode;
                    match key.code {
                        KeyCode::Esc => app.cancel_filter(),
                        KeyCode::Enter => app.apply_filter().await,
                        KeyCode::Tab => app.filter.next_field(),
                        KeyCode::BackTab => app.filter.prev_field(),
                        KeyCode::Backspace => {
                            app.filter.active_value_mut().pop();
                        }
                        KeyCode::Char(c) => {
                            app.filter.active_value_mut().push(c);
                        }
                        _ => {}
                    }
                } else {
                    // --- Normal / Quotes mode ---
                    use crossterm::event::KeyCode;
                    if is_quit(key) {
                        break;
                    }
                    match key.code {
                        // Normalize char to lowercase so F, R, J, K all work too.
                        KeyCode::Char(c) => match c.to_ascii_lowercase() {
                            'f' => app.open_filter(),
                            ' ' => match app.mode {
                                app::Mode::Browse => app.enable_quotes().await,
                                app::Mode::Quotes => app.disable_quotes(),
                            },
                            'r' => {
                                if app.mode == app::Mode::Quotes {
                                    app.fetch(true).await;
                                }
                            }
                            'j' => app.next_row(),
                            'k' => app.prev_row(),
                            _ => {}
                        },
                        KeyCode::Down => app.next_row(),
                        KeyCode::Up => app.prev_row(),
                        _ => {}
                    }
                }
            }
        }
    }

    // ------------------------------------------------------------------
    // Cleanup
    // ------------------------------------------------------------------
    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen)?;
    terminal.show_cursor()?;

    Ok(())
}
