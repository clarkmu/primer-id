use std::fs::{ self, File };
use std::error::Error;

pub struct LockFile {
    file_path: String,
}

impl LockFile {
    pub fn new(file_path: String) -> LockFile {
        LockFile {
            file_path,
        }
    }
    pub fn create(&self) -> Result<(), Box<dyn Error>> {
        File::create(&self.file_path)?;
        Ok(())
    }
    pub fn delete(&self) -> Result<(), Box<dyn Error>> {
        fs::remove_file(&self.file_path)?;
        Ok(())
    }
    pub fn exists(&self) -> Result<bool, Box<dyn Error>> {
        if fs::metadata(&self.file_path).is_ok() { Ok(true) } else { Ok(false) }
    }
}
