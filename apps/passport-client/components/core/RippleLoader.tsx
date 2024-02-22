// See CSS in global-zupass.css

export const RippleLoader = ({ text }: { text?: string }): JSX.Element => {
  return (
    <div className="loaderWrapper">
      <div className="loader">
        <div></div>
        <div></div>
      </div>
      {text && <div className="loaderText">{text}</div>}
    </div>
  );
};
