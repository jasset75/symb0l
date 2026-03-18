/// Names of the editable filter fields.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FilterField {
    /// Exact ticker match → `symbol_code` API param.
    SymbolCode,
    /// Partial name match → `instrument_name` API param.
    InstrumentName,
    Sector,
    Profile,
}

impl FilterField {
    pub const ALL: &'static [FilterField] = &[
        FilterField::SymbolCode,
        FilterField::InstrumentName,
        FilterField::Sector,
        FilterField::Profile,
    ];

    pub fn label(self) -> &'static str {
        match self {
            FilterField::SymbolCode => "Ticker",
            FilterField::InstrumentName => "Name",
            FilterField::Sector => "Sector",
            FilterField::Profile => "Profile",
        }
    }
}

/// Holds the current filter values and which field the user is editing.
#[derive(Debug, Clone, Default)]
pub struct FilterState {
    /// Exact ticker code filter (e.g. "AAPL").
    pub symbol_code: String,
    /// Partial name filter (e.g. "apple" matches "Apple Inc.").
    pub instrument_name: String,
    pub sector: String,
    pub profile: String,
    /// Index into `FilterField::ALL` — the field being edited.
    pub active: usize,
}

impl FilterState {
    /// Serialise non-empty fields as query-string pairs for the API.
    pub fn to_query_params(&self) -> Vec<(String, String)> {
        let mut params = Vec::new();
        if !self.symbol_code.is_empty() {
            params.push(("symbol_code".to_string(), self.symbol_code.to_uppercase()));
        }
        if !self.instrument_name.is_empty() {
            params.push(("instrument_name".to_string(), self.instrument_name.clone()));
        }
        if !self.sector.is_empty() {
            params.push(("sector".to_string(), self.sector.clone()));
        }
        if !self.profile.is_empty() {
            params.push(("profile".to_string(), self.profile.clone()));
        }
        params
    }

    /// Get a mutable reference to the currently active field value.
    pub fn active_value_mut(&mut self) -> &mut String {
        match FilterField::ALL[self.active] {
            FilterField::SymbolCode => &mut self.symbol_code,
            FilterField::InstrumentName => &mut self.instrument_name,
            FilterField::Sector => &mut self.sector,
            FilterField::Profile => &mut self.profile,
        }
    }

    /// Get an immutable reference to the currently active field value.
    #[allow(dead_code)]
    pub fn active_value(&self) -> &str {
        match FilterField::ALL[self.active] {
            FilterField::SymbolCode => &self.symbol_code,
            FilterField::InstrumentName => &self.instrument_name,
            FilterField::Sector => &self.sector,
            FilterField::Profile => &self.profile,
        }
    }

    /// Returns `true` if all fields are empty (no filter applied).
    #[allow(dead_code)]
    pub fn is_empty(&self) -> bool {
        self.symbol_code.is_empty()
            && self.instrument_name.is_empty()
            && self.sector.is_empty()
            && self.profile.is_empty()
    }

    /// Advance to the next field (wraps around).
    pub fn next_field(&mut self) {
        self.active = (self.active + 1) % FilterField::ALL.len();
    }

    /// Go to the previous field (wraps around).
    pub fn prev_field(&mut self) {
        if self.active == 0 {
            self.active = FilterField::ALL.len() - 1;
        } else {
            self.active -= 1;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn to_query_params_omits_empty_fields() {
        let f = FilterState {
            symbol_code: "AAPL".to_string(),
            ..Default::default()
        };
        let params = f.to_query_params();
        assert_eq!(params.len(), 1);
        assert_eq!(params[0], ("symbol_code".to_string(), "AAPL".to_string()));
    }

    #[test]
    fn to_query_params_partial_name() {
        let f = FilterState {
            instrument_name: "apple".to_string(),
            ..Default::default()
        };
        let params = f.to_query_params();
        assert_eq!(params.len(), 1);
        assert_eq!(
            params[0],
            ("instrument_name".to_string(), "apple".to_string())
        );
    }

    #[test]
    fn to_query_params_returns_all_non_empty() {
        let f = FilterState {
            symbol_code: "AAPL".to_string(),
            instrument_name: "Apple".to_string(),
            sector: "Technology".to_string(),
            profile: "Aggressive".to_string(),
            active: 0,
        };
        assert_eq!(f.to_query_params().len(), 4);
    }

    #[test]
    fn is_empty_when_all_blank() {
        assert!(FilterState::default().is_empty());
    }

    #[test]
    fn next_field_wraps() {
        let mut f = FilterState::default();
        f.active = FilterField::ALL.len() - 1;
        f.next_field();
        assert_eq!(f.active, 0);
    }
}
