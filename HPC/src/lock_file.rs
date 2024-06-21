use std::fs::{ self, OpenOptions };
use std::io::Write;
use chrono::Utc;
use std::time::{ SystemTime, Duration };
use anyhow::{ Context, Result };

pub struct LockFile {
    file_path: String,
}

impl LockFile {
    pub fn new(file_path: String) -> LockFile {
        LockFile {
            file_path,
        }
    }
    pub fn create(&self) -> Result<()> {
        let date = Utc::now().to_string();

        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .open(&self.file_path)
            .with_context(|| { format!("Could not create lock file: {}", &self.file_path) })?;

        write!(file, "{:?}", &date)?;

        Ok(())
    }
    pub fn delete(&self) -> Result<()> {
        fs::remove_file(&self.file_path)?;
        Ok(())
    }
    pub fn exists(&self) -> Result<bool> {
        Ok(fs::metadata(&self.file_path).is_ok())
    }
    pub fn is_stale(&self) -> Result<bool> {
        if !self.exists()? {
            return Ok(false);
        }

        let contents = fs::read_to_string(&self.file_path)?;
        let file_time = fs::metadata(&self.file_path)?.modified()?;
        let current_time = SystemTime::now();
        let duration = current_time.duration_since(file_time)?;
        let twelve_hours = Duration::from_secs(12 * 60 * 60);

        if duration > twelve_hours {
            return Ok(true);
        }

        Ok(false)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lock_file() {
        // create a lock file, check if it exists, delete it, check if it exists

        let lock_file = LockFile::new("test.lock".to_string());

        let exists_false = lock_file.exists().unwrap();
        assert_eq!(exists_false, false);

        let created = lock_file.create().unwrap();
        let exists_true = lock_file.exists().unwrap();
        assert_eq!(exists_true, true);

        let _ = lock_file.delete().unwrap();
        let exists_deleted = lock_file.exists().unwrap();
        assert_eq!(exists_deleted, false);
    }
}
