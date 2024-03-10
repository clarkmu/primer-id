const GENOMES: {
  value: string;
  label: string;
  tooltip: Element;
}[] = [
  {
    value: "HXB2",
    label: "HIV-1 HXB2",
    tooltip: (
      <>
        Reference:
        <br />
        <a
          href="https://www.ncbi.nlm.nih.gov/nuccore/K03455"
          target="_BLANK"
          rel="noreferrer"
        >
          HIV-1 HXB2 (K03455)
        </a>
      </>
    ),
  },
  {
    value: "NL43",
    label: "HIV-1 NL4-3",
    tooltip: (
      <>
        Reference:
        <br />
        <a
          href="https://www.ncbi.nlm.nih.gov/nuccore/AF324493"
          target="_BLANK"
          rel="noreferrer"
        >
          HIV-1 NL4-3 (AF324493)
        </a>
      </>
    ),
  },
  {
    value: "MAC239",
    label: "SIV MAC239",
    tooltip: (
      <>
        Reference:
        <br />
        <a
          href="https://www.ncbi.nlm.nih.gov/nuccore/M33262"
          target="_BLANK"
          rel="noreferrer"
        >
          SIV MAC239 (M33262)
        </a>
      </>
    ),
  },
];

export default GENOMES;
