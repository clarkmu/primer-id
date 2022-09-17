import React from "react";
import Button from "@/components/form/Button";
import Paper from "@/components/form/Paper";
import LINKS from "@/utils/constants/LINKS";

const { IMAGES } = LINKS;

const MyCard = ({ src, title, children }) => (
  <Paper className="flex flex-col gap-4 items-center justify-center">
    <img src={src} alt={title} className="w-full" />
    {children}
  </Paper>
);

const LinkButton = ({ href, children }) => (
  <Button fullWidth target="_BLANK" href={href}>
    {children}
  </Button>
);

export const LinksPage = () => (
  <div className="flex flex-col gap-4">
    <div className="flex flex-col gap-4">
      <Paper className="flex flex-col">
        <div>Shuntai Zhou</div>
        <a href="mailto:shuntaiz@email.unc.edu">shuntaiz@email.unc.edu</a>
        <div>University of North Carolina at Chapel Hill</div>
        <div>450 West Dr.</div>
        <div>Chapel Hill, NC USA</div>
      </Paper>
      <Paper>
        <div>
          Technical issues about this webapp should be directed to Michael Clark
          (<a href="mailto:clarkmu@gmail.com">clarkmu@gmail.com</a>)
        </div>
      </Paper>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex flex-col gap-4">
          <MyCard src={IMAGES.swanstrom} title="Swanstrom Lab">
            <LinkButton href={LINKS.SWANSTROM_HOMEPAGE}>
              Swanstrom Lab Webpage
            </LinkButton>
            <LinkButton href={LINKS.SWANSTROM_GITHUB}>
              Swanstrom Lab GitHub
            </LinkButton>
          </MyCard>
          <MyCard src={IMAGES.drDatabase} title="HIV-DR Database">
            <LinkButton href={LINKS.DRDB}>
              HIV Drug Resistance Database
            </LinkButton>
          </MyCard>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <MyCard src={IMAGES.geno2pheno} title="Geno2Pheno">
            <LinkButton href={LINKS.G2P}>Geno2pheno[corereceptor]</LinkButton>
          </MyCard>
          <MyCard src={IMAGES.figtree} title="Fig Tree with sequence viewer">
            <div className="text-lg font-lg">Fig Tree with sequence viewer</div>
            <div>
              For high resolution displays, ensure {'"Fix Scale"'} is checked in
              the top toolbar to correctly select tips in the tree.
            </div>
            <LinkButton href={LINKS.FIGTREE_DOWNLOAD.MAC}>MacOS</LinkButton>
            <LinkButton href={LINKS.FIGTREE_DOWNLOAD.WINDOWS}>
              Windows
            </LinkButton>
            <LinkButton href={LINKS.FIGTREE_DOWNLOAD.JAR}>.jar</LinkButton>
          </MyCard>
        </div>
      </div>
    </div>
  </div>
);

export default function Links() {
  return <LinksPage />;
}
