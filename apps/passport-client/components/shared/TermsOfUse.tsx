import { useCallback, useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";
import { Button } from "../core";

export function TermsOfUse() {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = useCallback(() => setExpanded(!expanded), [expanded]);

  const termsRef = useRef(null);

  useEffect(() => {
    termsRef.current.scroll({ top: 0 });
  });

  return (
    <>
      <Wrapper>
        <Terms
          ref={termsRef}
          expanded={expanded}
          onClick={!expanded && toggleExpand}
        >
          I, JOHANN FAUSTUS, Dr.,
          <br />
          <br />
          Do publicly declare with mine own hand in covenant & by power of these
          presents:
          <br />
          <br />
          Whereas, mine own spiritual faculties having been exhaustively
          explored (including the gifts dispensed from above and graciously
          imparted to me), I still cannot comprehend;
          <br /> <br />
          And whereas, it being my wish to probe further into the matter, I do
          propose to speculate upon the Elementa;
          <br /> <br />
          And whereas mankind doth not teach such things;
          <br /> <br />
          Now therefore have I summoned the spirit who calleth himself
          Mephostophiles, a servant of the Hellish Prince in Orient, charged
          with informing and instructing me, and agreeing against a promissory
          instrument hereby transferred unto him to be subservient and obedient
          to me in all things.
          <br /> <br />
          I do promise him in return that, when I be fully sated of that which I
          desire of him, twenty-four years also being past, ended and expired,
          he may at such a time and in whatever manner or wise pleaseth him
          order, ordain, reign, rule and possess all that may be mine: body,
          property, flesh, blood, etc., herewith duly bound over in eternity and
          surrendered by covenant in mine own hand by authority and power of
          these presents, as well as of my mind, brain, intent, blood and will.
          <br /> <br />
          I do now defy all living beings, all the Heavenly Host and all
          mankind, and this must be.
          <br /> <br />
          In confirmation and contract whereof I have drawn out mine own blood
          for certification in lieu of a seal.
        </Terms>
        {expanded && (
          <CloseButtonContainer>
            <Button size="small" onClick={toggleExpand}>
              Close
            </Button>
          </CloseButtonContainer>
        )}
        <ReadMore onClick={toggleExpand}>Read More</ReadMore>
      </Wrapper>
    </>
  );
}

const Wrapper = styled.div`
  max-height: 100vh;
`;

const CloseButtonContainer = styled.div`
  position: fixed;
  bottom: 8px;
  left: 0px;
  display: flex;
  justify-content: center;
  width: 100%;
`;

const Terms = styled.div<{ expanded: boolean }>`
  ${({ expanded }) => {
    return expanded
      ? css`
          position: fixed;
          width: 100%;
          height: 100vh;
          min-height: 100vh;
          top: 0;
          left: 0;
          overflow: scroll;
          padding: 16px 8px 64px 8px;
        `
      : css`
          cursor: pointer;
          overflow: hidden;
          max-height: 30vh;
          mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
          -webkit-mask-image: linear-gradient(
            to bottom,
            black 60%,
            transparent 100%
          );
          padding: 16px 8px;
        `;
  }}
  background: var(--white);
  color: var(--black);

  margin-top: 12px;
  text-align: left;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
`;

const ReadMore = styled.div`
  margin: 0px auto;
  text-align: center;
  color: var(--white);
  cursor: pointer;
`;
