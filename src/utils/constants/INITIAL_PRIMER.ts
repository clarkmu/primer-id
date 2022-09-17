import { PrimerInterface } from "@/models/TCSDR";

const INITIAL_PRIMER: PrimerInterface = {
  region: "",
  supermajority: 0.5,
  forward: "",
  cdna: "",
  endJoin: false,
  endJoinOption: 0,
  endJoinOverlap: 0,
  qc: false,
  refGenome: "",
  refStart: "",
  refEnd: "",
  allowIndels: true,
  trim: false,
  trimGenome: "",
  trimStart: "",
  trimEnd: "",
};

export default INITIAL_PRIMER;
