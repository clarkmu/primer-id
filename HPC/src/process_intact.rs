use anyhow::Result;

use crate::pipeline::{ IntactAPI, Pipeline };

pub async fn init(pipeline: &Pipeline<IntactAPI>) -> Result<()> {
    let _s = pipeline.data.sequence.clone();
    Ok(())
}
