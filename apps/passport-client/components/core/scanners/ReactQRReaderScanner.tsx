import { useCallback } from "react";
import { OnResultFunction, QrReader } from "react-qr-reader";
import styled from "styled-components";

export function ReactQrReaderScanner({
  onResult
}: {
  onResult: (result: string) => void;
}): JSX.Element {
  const onQrReaderResult = useCallback(
    (result: Parameters<OnResultFunction>[0]) => {
      if (result) {
        onResult(result.getText());
      }
    },
    [onResult]
  );

  return (
    <QrReader
      className="qr"
      onResult={onQrReaderResult}
      constraints={{ facingMode: "environment", aspectRatio: 1 }}
      ViewFinder={ViewFinder}
      containerStyle={{ width: "100%" }}
    />
  );
}

function ViewFinder(): JSX.Element {
  return (
    <ScanOverlayWrap>
      <Guidebox>
        <Corner top left />
        <Corner top />
        <Corner left />
        <Corner />
      </Guidebox>
    </ScanOverlayWrap>
  );
}

const ScanOverlayWrap = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  z-index: 1;
  margin: 16px;
`;

const Guidebox = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 75%;
  height: 75%;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
`;

const Corner = styled.div<{ top?: boolean; left?: boolean }>`
  position: absolute;
  ${(p): string => (p.top ? "top: 0" : "bottom: 0")};
  ${(p): string => (p.left ? "left: 0" : "right: 0")};
  border: 2px solid white;
  ${(p): string => (p.left ? "border-right: none" : "border-left: none")};
  ${(p): string => (p.top ? "border-bottom: none" : "border-top: none")};
  width: 16px;
  height: 16px;
  ${(p): string => (p.left && p.top ? "border-radius: 8px 0 0 0;" : "")};
  ${(p): string => (p.left && !p.top ? "border-radius: 0 0 0 8px;" : "")};
  ${(p): string => (!p.left && p.top ? "border-radius: 0 8px 0 0;" : "")};
  ${(p): string => (!p.left && !p.top ? "border-radius: 0 0 8px 0;" : "")};
`;
