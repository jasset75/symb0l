use std::time::{Duration, Instant};

use ratatui::widgets::TableState;

use crate::api::{ApiClient, Listing};
use crate::filter::FilterState;

// ---------------------------------------------------------------------------
// Mode
// ---------------------------------------------------------------------------

/// Application operating mode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Mode {
    /// Browse mode: listings without quotes, free, no TwelveData calls.
    Browse,
    /// Quotes mode: listings with real-time prices, periodic refresh active.
    Quotes,
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

pub struct App {
    // Data
    pub listings: Vec<Listing>,

    // UI state
    pub table_state: TableState,
    pub filter: FilterState,
    pub editing: bool, // filter panel open?
    pub mode: Mode,

    // Async / loading
    pub loading: bool,
    pub error: Option<String>,

    // Refresh
    pub last_refresh: Instant,
    pub refresh_interval: Duration,

    // API
    client: ApiClient,
}

impl App {
    pub fn new(client: ApiClient, refresh_interval: Duration) -> Self {
        Self {
            listings: Vec::new(),
            table_state: TableState::default(),
            filter: FilterState::default(),
            editing: false,
            mode: Mode::Browse,
            loading: false,
            error: None,
            last_refresh: Instant::now()
                .checked_sub(refresh_interval)
                .unwrap_or_else(Instant::now),
            refresh_interval,
            client,
        }
    }

    // -----------------------------------------------------------------------
    // Fetch
    // -----------------------------------------------------------------------

    /// Request listings from the API.
    ///
    /// `include_quote = false` → free, no TwelveData call (Browse).
    /// `include_quote = true`  → attaches real-time prices (Quotes).
    pub async fn fetch(&mut self, include_quote: bool) {
        self.loading = true;
        self.error = None;
        let params = self.filter.to_query_params();
        match self.client.get_listings(params, include_quote).await {
            Ok(listings) => {
                self.listings = listings;
                self.last_refresh = Instant::now();
                // Clamp table selection to valid range.
                if self.listings.is_empty() {
                    self.table_state.select(None);
                } else {
                    let sel = self.table_state.selected().unwrap_or(0);
                    self.table_state
                        .select(Some(sel.min(self.listings.len() - 1)));
                }
            }
            Err(e) => {
                self.error = Some(format!("API error: {e}"));
            }
        }
        self.loading = false;
    }

    // -----------------------------------------------------------------------
    // Tick callback (called by EventHandler on every tick)
    // -----------------------------------------------------------------------

    /// Called periodically. In Quotes mode, triggers a refresh when the
    /// interval has elapsed. In Browse mode, does nothing (free).
    pub async fn on_tick(&mut self) {
        if self.mode == Mode::Quotes && self.last_refresh.elapsed() >= self.refresh_interval {
            self.fetch(true).await;
        }
    }

    // -----------------------------------------------------------------------
    // Mode transitions
    // -----------------------------------------------------------------------

    /// Activate Quotes mode: load prices and start the refresh timer.
    pub async fn enable_quotes(&mut self) {
        self.mode = Mode::Quotes;
        self.fetch(true).await;
    }

    /// Deactivate Quotes mode: keep the current listing but strip quote data
    /// (they'll be stale anyway) and return to Browse.
    pub fn disable_quotes(&mut self) {
        self.mode = Mode::Browse;
        // Clear quotes from cached listings so stale prices aren't shown.
        for listing in &mut self.listings {
            listing.quote = None;
        }
    }

    // -----------------------------------------------------------------------
    // Navigation
    // -----------------------------------------------------------------------

    pub fn next_row(&mut self) {
        if self.listings.is_empty() {
            return;
        }
        let i = match self.table_state.selected() {
            Some(i) => (i + 1) % self.listings.len(),
            None => 0,
        };
        self.table_state.select(Some(i));
    }

    pub fn prev_row(&mut self) {
        if self.listings.is_empty() {
            return;
        }
        let i = match self.table_state.selected() {
            Some(0) | None => self.listings.len() - 1,
            Some(i) => i - 1,
        };
        self.table_state.select(Some(i));
    }

    // -----------------------------------------------------------------------
    // Filter panel helpers
    // -----------------------------------------------------------------------

    /// Open the filter panel and reset to first field.
    pub fn open_filter(&mut self) {
        self.editing = true;
        self.filter.active = 0;
        // Opening the filter forces Browse mode so the user doesn't waste
        // quote credits while adjusting criteria.
        if self.mode == Mode::Quotes {
            self.disable_quotes();
        }
    }

    /// Apply filters: close panel, fetch without quotes (Browse).
    pub async fn apply_filter(&mut self) {
        self.editing = false;
        self.mode = Mode::Browse;
        self.fetch(false).await;
    }

    /// Cancel filter editing without triggering a new fetch.
    pub fn cancel_filter(&mut self) {
        self.editing = false;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_app() -> App {
        let client = ApiClient::new("http://localhost:3000");
        App::new(client, Duration::from_secs(60))
    }

    #[test]
    fn starts_in_browse_mode() {
        let app = make_app();
        assert_eq!(app.mode, Mode::Browse);
    }

    #[test]
    fn disable_quotes_clears_mode() {
        let mut app = make_app();
        app.mode = Mode::Quotes;
        app.disable_quotes();
        assert_eq!(app.mode, Mode::Browse);
    }

    #[test]
    fn next_row_wraps() {
        let mut app = make_app();
        // Inject two fake listings by manipulating the vec directly.
        app.listings = vec![
            serde_json::from_str(r#"{"symbol_code":"A","instrument_name":"","instrument_type":"","isin":"","profile":"","risk_level":"","asset_class_level":"","market_cap":"","sector":"","sub_industry":"","country_exposure":"","market_name":"","market_mic":"","market_timezone":"","country_code":"","country_name":"","currency_code":"","currency_symbol":"","quote":null}"#).unwrap(),
            serde_json::from_str(r#"{"symbol_code":"B","instrument_name":"","instrument_type":"","isin":"","profile":"","risk_level":"","asset_class_level":"","market_cap":"","sector":"","sub_industry":"","country_exposure":"","market_name":"","market_mic":"","market_timezone":"","country_code":"","country_name":"","currency_code":"","currency_symbol":"","quote":null}"#).unwrap(),
        ];
        app.table_state.select(Some(1));
        app.next_row();
        assert_eq!(app.table_state.selected(), Some(0)); // wraps
    }
}
