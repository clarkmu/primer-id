const publicBucketPath = "https://storage.googleapis.com/tcs-dr-public/";

const LINKS = {
  RUBY_API_SERVER: "https://api-ruby-secure-dept-tcs.apps.cloudapps.unc.edu",
  TCS_VERSION_SOURCE:
    "https://api.github.com/repos/viralseq/viral_seq/releases/latest",
  IMAGES: {
    // intro: publicBucketPath + "pid.png",
    intro:
      "https://raw.githubusercontent.com/ViralSeq/viral_seq/master/docs/assets/img/cover.jpg",
    figtree: publicBucketPath + "figtree.png",
    swanstrom: publicBucketPath + "swanslab.png",
    drDatabase: publicBucketPath + "drdb.png",
    geno2pheno: publicBucketPath + "g2p.png",
  },
  FIGTREE_DOWNLOAD: {
    JAR: publicBucketPath + "fig.jar",
    MAC: publicBucketPath + "fig.app.zip",
    WINDOWS: publicBucketPath + "FigTree.exe",
  },
  citation: "https://www.ncbi.nlm.nih.gov/pubmed/26041299",
  prepProtocol:
    "https://www.protocols.io/view/primer-id-miseq-library-prep-useewbe",
  SWANSTROM_HOMEPAGE: "http://swanstrom.web.unc.edu/",
  SWANSTROM_GITHUB: "https://github.com/swanstromlab",
  DRDB: "https://www.hivdb.stanford.edu/",
  G2P: "https://coreceptor.geno2pheno.org/",
  FASTTREE_DOWNLOAD: {
    DOWNLOAD: publicBucketPath + "fasttree.zip",
    IMAGE: "https://morgannprice.github.io/fasttree/splits.png",
  },
};

export default LINKS;
