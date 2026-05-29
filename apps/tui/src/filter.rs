/// Names of the editable filter fields.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FilterField {
    Sector,
    Profile,
    /// Partial name match → `instrument_name` API param.
    InstrumentName,
    /// Exact ticker match → `symbol_code` API param.
    SymbolCode,
}

impl FilterField {
    pub const ALL: &'static [FilterField] = &[
        FilterField::Sector,
        FilterField::Profile,
        FilterField::InstrumentName,
        FilterField::SymbolCode,
    ];

    pub fn label(self) -> &'static str {
        match self {
            FilterField::Sector => "Sector",
            FilterField::Profile => "Profile",
            FilterField::InstrumentName => "Name",
            FilterField::SymbolCode => "Ticker",
        }
    }
}

/// Holds the current filter values and which field the user is editing.
#[derive(Debug, Clone, Default)]
pub struct FilterState {
    pub sector: String,
    pub profile: String,
    pub instrument_name: String,
    pub symbol_code: String,

    /// Index into `FilterField::ALL` — the field being edited.
    pub active: usize,

    /// Selected index in the autocomplete dropdown (if any).
    pub suggestion_idx: Option<usize>,

    /// Dynamically discovered sectors from API
    pub known_sectors: Vec<String>,
    /// Dynamically discovered profiles from API
    pub known_profiles: Vec<String>,
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
        // Reset suggestion index when the content changes
        self.suggestion_idx = None;
        match FilterField::ALL[self.active] {
            FilterField::Sector => &mut self.sector,
            FilterField::Profile => &mut self.profile,
            FilterField::InstrumentName => &mut self.instrument_name,
            FilterField::SymbolCode => &mut self.symbol_code,
        }
    }

    /// Get an immutable reference to the currently active field value.
    #[allow(dead_code)]
    pub fn active_value(&self) -> &str {
        match FilterField::ALL[self.active] {
            FilterField::Sector => &self.sector,
            FilterField::Profile => &self.profile,
            FilterField::InstrumentName => &self.instrument_name,
            FilterField::SymbolCode => &self.symbol_code,
        }
    }

    /// Get matching suggestions for the currently active field.
    pub fn get_suggestions(&self) -> Vec<&str> {
        let input = self.active_value().to_lowercase();
        if input.is_empty() {
            return vec![];
        }

        match FilterField::ALL[self.active] {
            FilterField::Sector => self
                .known_sectors
                .iter()
                .filter(|s| s.to_lowercase().contains(&input))
                .map(|s| s.as_str())
                .collect(),
            FilterField::Profile => self
                .known_profiles
                .iter()
                .filter(|s| s.to_lowercase().contains(&input))
                .map(|s| s.as_str())
                .collect(),
            _ => vec![],
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
        self.suggestion_idx = None;
    }

    /// Go to the previous field (wraps around).
    pub fn prev_field(&mut self) {
        if self.active == 0 {
            self.active = FilterField::ALL.len() - 1;
        } else {
            self.active -= 1;
        }
        self.suggestion_idx = None;
    }

    pub fn suggestion_down(&mut self) {
        let suggestions = self.get_suggestions();
        if suggestions.is_empty() {
            return;
        }
        self.suggestion_idx = match self.suggestion_idx {
            Some(i) => Some((i + 1).min(suggestions.len() - 1)),
            None => Some(0),
        };
    }

    pub fn suggestion_up(&mut self) {
        let suggestions = self.get_suggestions();
        if suggestions.is_empty() {
            return;
        }
        self.suggestion_idx = match self.suggestion_idx {
            Some(0) | None => Some(0),
            Some(i) => Some(i - 1),
        };
    }

    /// Applies the currently selected suggestion. Returns true if a suggestion was applied.
    pub fn apply_suggestion(&mut self) -> bool {
        if let Some(idx) = self.suggestion_idx {
            let suggestions = self.get_suggestions();
            if idx < suggestions.len() {
                let text = suggestions[idx].to_string();
                // Assign text without triggering active_value_mut to keep suggestion_idx (handled manually here)
                match FilterField::ALL[self.active] {
                    FilterField::Sector => self.sector = text,
                    FilterField::Profile => self.profile = text,
                    _ => {}
                }
                self.suggestion_idx = None;
                return true;
            }
        }
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn state_with_suggestions() -> FilterState {
        FilterState {
            known_sectors: vec![
                "Communication Services".to_string(),
                "Information Technology".to_string(),
                "Health Care".to_string(),
            ],
            known_profiles: vec![
                "Growth".to_string(),
                "Income".to_string(),
                "Speculative".to_string(),
            ],
            ..Default::default()
        }
    }

    #[test]
    fn to_query_params_omits_empty_fields() {
        let filter = FilterState {
            symbol_code: "aapl".to_string(),
            ..Default::default()
        };

        assert_eq!(
            filter.to_query_params(),
            vec![("symbol_code".to_string(), "AAPL".to_string())],
        );
    }

    #[test]
    fn to_query_params_returns_all_non_empty() {
        let filter = FilterState {
            sector: "Information Technology".to_string(),
            profile: "Growth".to_string(),
            instrument_name: "Apple".to_string(),
            symbol_code: "AAPL".to_string(),
            ..Default::default()
        };

        assert_eq!(
            filter.to_query_params(),
            vec![
                ("symbol_code".to_string(), "AAPL".to_string()),
                ("instrument_name".to_string(), "Apple".to_string()),
                ("sector".to_string(), "Information Technology".to_string()),
                ("profile".to_string(), "Growth".to_string()),
            ],
        );
    }

    #[test]
    fn is_empty_when_filter_values_are_blank() {
        let filter = FilterState {
            known_sectors: vec!["Information Technology".to_string()],
            known_profiles: vec!["Growth".to_string()],
            ..Default::default()
        };

        assert!(filter.is_empty());
    }

    #[test]
    fn next_field_wraps_and_clears_selected_suggestion() {
        let mut filter = FilterState {
            active: FilterField::ALL.len() - 1,
            suggestion_idx: Some(0),
            ..Default::default()
        };

        filter.next_field();

        assert_eq!(filter.active, 0);
        assert_eq!(filter.suggestion_idx, None);
    }

    #[test]
    fn suggestions_match_active_sector_case_insensitively() {
        let mut filter = state_with_suggestions();
        filter.sector = "tech".to_string();

        assert_eq!(filter.get_suggestions(), vec!["Information Technology"]);
    }

    #[test]
    fn suggestions_are_only_available_for_sector_and_profile() {
        let mut filter = state_with_suggestions();
        filter.active = 2;
        filter.instrument_name = "growth".to_string();

        assert!(filter.get_suggestions().is_empty());
    }

    #[test]
    fn suggestion_navigation_clamps_to_available_items() {
        let mut filter = state_with_suggestions();
        filter.profile = "i".to_string();
        filter.active = 1;

        filter.suggestion_down();
        filter.suggestion_down();
        filter.suggestion_down();

        assert_eq!(filter.suggestion_idx, Some(1));

        filter.suggestion_up();

        assert_eq!(filter.suggestion_idx, Some(0));
    }

    #[test]
    fn apply_suggestion_sets_active_filter_value() {
        let mut filter = state_with_suggestions();
        filter.sector = "comm".to_string();
        filter.suggestion_idx = Some(0);

        assert!(filter.apply_suggestion());
        assert_eq!(filter.sector, "Communication Services");
        assert_eq!(filter.suggestion_idx, None);
    }
}
