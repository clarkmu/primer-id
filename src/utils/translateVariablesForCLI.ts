/**
 * translate variable names to/from viral_seq CLI
 */

export const variablesToViralSeqCLI = (data) => ({
  primer_pairs: data.pipeline?.primers?.map((p) => ({
    region: p.region,
    forward: p.forward,
    cdna: p.cdna,
    majority: p.supermajority,
    indel: p.allowIndels,
    end_join: p.endJoin,
    end_join_option: p.endJoinOption,
    overlap: p.endJoinOverlap,
    TCS_QC: p.qc,
    ref_genome: p.refGenome,
    ref_start: p.refStart,
    ref_end: p.refEnd,
    trim_ref: p.trimGenome,
    trim_ref_start: p.trimStart,
    trim_ref_end: p.trimEnd,
  })),
  platform_error_rate: data.pipeline.errorRate,
  platform_format: data.pipeline.platformFormat,
  email: data.pipeline.email,
});

export const variablesFromViralSeqCLI = (data) => ({
  primers: data.primer_pairs?.map((p) => ({
    region: p.region,
    forward: p.forward,
    cdna: p.cdna,
    supermajority: p.majority,
    allowIndels: p.indel,
    endJoin: p.end_join,
    endJoinOption: p.end_join_option,
    endJoinOverlap: p.overlap,
    qc: p.TCS_QC,
    refGenome: p.ref_genome,
    refStart: p.ref_start,
    refEnd: p.ref_end,
    trimGenome: p.trim_ref,
    trimStart: p.trim_ref_start,
    trimEnd: p.trim_ref_end,
  })),
  errorRate: data.platform_error_rate,
  platformFormat: data.platform_format,
  email: data.email,
});
