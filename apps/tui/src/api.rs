#![allow(dead_code)]
use serde::Deserialize;

// ---------------------------------------------------------------------------
// Response types (mirrors apps/api ListingSchema + QuoteResultSchema)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Deserialize)]
pub struct Quote {
    pub symbol: String,
    pub price: Option<f64>,
    pub change: Option<f64>,
    pub percent_change: Option<f64>,
    pub currency: Option<String>,
    pub exchange: Option<String>,
    pub name: Option<String>,
    pub close: Option<f64>,
    pub open: Option<f64>,
    pub high: Option<f64>,
    pub low: Option<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum QuoteResult {
    Success { data: Quote },
    Error { error: QuoteError },
    NotFound,
}

#[derive(Debug, Clone, Deserialize)]
pub struct QuoteError {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Listing {
    pub symbol_code: String,
    pub instrument_name: String,
    pub instrument_type: String,
    pub isin: String,
    pub profile: String,
    pub risk_level: String,
    pub asset_class_level: String,
    pub market_cap: String,
    pub sector: String,
    pub sub_industry: String,
    pub country_exposure: String,
    pub market_name: String,
    pub market_mic: String,
    pub market_timezone: String,
    pub country_code: String,
    pub country_name: String,
    pub currency_code: String,
    pub currency_symbol: String,
    pub quote: Option<QuoteResult>,
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/// HTTP client wrapper for the Symb0l API.
#[derive(Debug, Clone)]
pub struct ApiClient {
    base_url: String,
    client: reqwest::Client,
}

impl ApiClient {
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into(),
            client: reqwest::Client::new(),
        }
    }

    /// Fetch listings from the API.
    ///
    /// `filters` are extra query-string pairs (e.g. `[("symbol_code", "AAPL")]`).
    /// If `include_quote` is `true`, the API will call TwelveData to attach
    /// real-time prices — this consumes the free-tier quota.
    pub async fn get_listings(
        &self,
        filters: Vec<(String, String)>,
        include_quote: bool,
    ) -> Result<Vec<Listing>, reqwest::Error> {
        let url = format!("{}/v0/listings", self.base_url);

        let mut params = filters;
        if include_quote {
            params.push(("include_quote".to_string(), "true".to_string()));
        }
        // Request maximum allowed page size to reduce the number of round-trips.
        params.push(("limit".to_string(), "100".to_string()));

        let response = self
            .client
            .get(&url)
            .query(&params)
            .send()
            .await?
            .error_for_status()?;

        let listings: Vec<Listing> = response.json().await?;
        Ok(listings)
    }
}
