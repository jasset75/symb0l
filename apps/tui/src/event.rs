use std::time::Duration;

use crossterm::event::{Event as CEvent, EventStream, KeyCode, KeyEvent, KeyModifiers};
use futures::StreamExt;
use tokio::sync::mpsc;

/// Events that the application can receive from the event loop.
#[derive(Debug)]
pub enum AppEvent {
    /// A key press from the user.
    Key(KeyEvent),
    /// Periodic tick for refresh checks.
    Tick,
    /// Terminal resize.
    Resize,
}

/// Spawns a background task that reads crossterm events using the async
/// `EventStream` (no blocking calls on tokio threads) and emits `AppEvent`s
/// over an unbounded channel. The tick interval is handled via
/// `tokio::time::interval`, also fully async.
pub struct EventHandler {
    rx: mpsc::UnboundedReceiver<AppEvent>,
}

impl EventHandler {
    pub fn new(tick_rate: Duration) -> Self {
        let (tx, rx) = mpsc::unbounded_channel();

        tokio::spawn(async move {
            let mut reader = EventStream::new();
            let mut ticker = tokio::time::interval(tick_rate);

            loop {
                tokio::select! {
                    _ = ticker.tick() => {
                        let _ = tx.send(AppEvent::Tick);
                    }
                    maybe_event = reader.next() => {
                        match maybe_event {
                            Some(Ok(CEvent::Key(key))) => {
                                let _ = tx.send(AppEvent::Key(key));
                            }
                            Some(Ok(CEvent::Resize(_, _))) => {
                                let _ = tx.send(AppEvent::Resize);
                            }
                            // Stream ended or I/O error → exit the task.
                            Some(Err(_)) | None => break,
                            _ => {}
                        }
                    }
                }
            }
        });

        Self { rx }
    }

    /// Receive the next event (async, blocks until one arrives).
    pub async fn next(&mut self) -> Option<AppEvent> {
        self.rx.recv().await
    }
}

/// Determine if a key event is a quit signal (`q`/`Q` or `Ctrl-C`).
pub fn is_quit(key: KeyEvent) -> bool {
    match key.code {
        KeyCode::Char(c) if c.to_ascii_lowercase() == 'q' => true,
        KeyCode::Char('c') if key.modifiers.contains(KeyModifiers::CONTROL) => true,
        _ => false,
    }
}
