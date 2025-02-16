import { TcsdrsPrimers } from "@prisma/client";

const INITIAL_PRIMER: TcsdrsPrimers = {
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
