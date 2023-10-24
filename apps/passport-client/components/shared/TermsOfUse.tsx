import { useCallback, useState } from "react";
import styled from "styled-components";
import { Button, Spacer } from "../core";

function TermsText() {
  return (
    <>
      I, JOHANN FAUSTUS, Dr.,
      <br />
      <br />
      Do publicly declare with mine own hand in covenant & by power of these
      presents:
      <br />
      <br />
      Whereas, mine own spiritual faculties having been exhaustively explored
      (including the gifts dispensed from above and graciously imparted to me),
      I still cannot comprehend;
      <br /> <br />
      And whereas, it being my wish to probe further into the matter, I do
      propose to speculate upon the Elementa;
      <br /> <br />
      And whereas mankind doth not teach such things;
      <br /> <br />
      Now therefore have I summoned the spirit who calleth himself
      Mephostophiles, a servant of the Hellish Prince in Orient, charged with
      informing and instructing me, and agreeing against a promissory instrument
      hereby transferred unto him to be subservient and obedient to me in all
      things.
      <br /> <br />
      I do promise him in return that, when I be fully sated of that which I
      desire of him, twenty-four years also being past, ended and expired, he
      may at such a time and in whatever manner or wise pleaseth him order,
      ordain, reign, rule and possess all that may be mine: body, property,
      flesh, blood, etc., herewith duly bound over in eternity and surrendered
      by covenant in mine own hand by authority and power of these presents, as
      well as of my mind, brain, intent, blood and will.
      <br /> <br />
      I do now defy all living beings, all the Heavenly Host and all mankind,
      and this must be.
      <br /> <br />
      In confirmation and contract whereof I have drawn out mine own blood for
      certification in lieu of a seal.
    </>
  );
}

export function TermsOfUse() {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = useCallback(() => setExpanded(!expanded), [expanded]);

  return (
    <>
      <Wrapper>
        {expanded ? (
          <ExpandedTerms>
            <ExpandedTermsTextContainer>
              <TermsText />
            </ExpandedTermsTextContainer>
            <CloseButtonContainer>
              <Button size="large" onClick={toggleExpand}>
                Minimize
              </Button>
            </CloseButtonContainer>
          </ExpandedTerms>
        ) : (
          <MinimizedTerms onClick={!expanded && toggleExpand}>
            <TermsText />
          </MinimizedTerms>
        )}
        <Spacer h={16} />
        <Button size="large" onClick={toggleExpand}>
          Read More
        </Button>
      </Wrapper>
    </>
  );
}

const Wrapper = styled.div`
  max-height: 100vh;
`;

const CloseButtonContainer = styled.div`
  width: 100%;
`;

const MinimizedTerms = styled.div`
  background: var(--white);
  color: var(--black);
  text-align: left;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  margin-top: 12px;
  cursor: pointer;
  overflow: hidden;
  max-height: 20vh;
  mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
  padding: 16px;

  &:hover {
    background: rgba(255, 255, 255, 0.9);
  }
`;

const ExpandedTerms = styled.div`
  background: var(--bg-lite-primary);
  color: var(--black);
  text-align: left;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  position: fixed;
  top: 5vh;
  left: 5vw;

  width: 90vw;
  height: 90vh;
  max-width: 90vw;
  max-height: 90vh;

  overflow: hidden;
  padding: 16px;
  box-sizing: border-box;
  border-radius: 12px;

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;

  gap: 16px;
`;

const ExpandedTermsTextContainer = styled.div`
  overflow-y: scroll;
  border-radius: 8px;
  padding: 32px 16px;
  background: white;
`;
