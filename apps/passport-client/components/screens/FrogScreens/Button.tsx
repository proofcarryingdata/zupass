import React, {
  CSSProperties,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { useInView } from "react-intersection-observer";
import { ParallaxBanner, ParallaxProvider } from "react-scroll-parallax";
import styled, { keyframes } from "styled-components";
import {
  useCelestialPondParticles,
  useFrogParticles,
  useWrithingVoidParticles
} from "./useFrogParticles";

/**
 * A button that shows a loading spinner while the action is in progress.
 */
export function ActionButton({
  children,
  onClick,
  disabled,
  ButtonComponent = Button
}: {
  children: React.ReactNode;
  /**
   * The action to perform when the button is clicked. This should return a
   * promise that resolves when the action is complete.
   */
  onClick: () => Promise<unknown>;
  disabled?: boolean;
  /**
   * The component to use for the button. Defaults to Button.
   */
  ButtonComponent?: React.ComponentType<React.ComponentProps<typeof Button>>;
}) {
  const [loading, setLoading] = useState(false);
  // Every user click increment the trigger count, which will trigger the
  // useEffect to kick onClick action below.
  const [trigger, setTrigger] = useState(0);
  // nb: This improves the developer ergnomic and perserve the onClick semantics
  // such that it only fires once on click. By using ref, our trigger logic can
  // be freed from it as a dependency. Otherwise user needs to wrap onClick in
  // useCallback.
  const onClickRef = useRef(onClick);
  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  // monitor if a button is visible in the viewport and only trigger onClick
  // action when it is visible. low effort way to prevent low effort scripting
  const { ref, inView } = useInView();
  const inViewRef = useRef(inView);
  useEffect(() => {
    inViewRef.current = inView;
  }, [inView]);

  // nb: This useEffect is the core logic of this component. It will trigger
  // onClick action when trigger count is incremented. It will also set loading
  // state to true when onClick action is triggered, and set loading state to
  // false when onClick action is done.
  //
  // The key invariant is that because onClick action is async, we need to
  // ensure that the following scenario is handled correctly:
  //
  // 1. User click the button
  // 2. onClick action is triggered (Attempt X)
  // 3. User click the button again
  // 4. onClick action is triggered (Attempt Y)
  // 5. onClick action X is done, setting loading state to false, even though Y
  //    is still in progress.
  //
  // This would be incorrect and is handled by the abortController below.
  useEffect(() => {
    if (!inViewRef.current) {
      return;
    }

    const abortController = new AbortController();

    if (trigger > 0) {
      setLoading(true);
      onClickRef
        .current()
        .catch((e) => {
          console.error(e);
        })
        .finally(() => {
          // aborted means a newer onClick action is triggered and we should
          // take no further action
          if (abortController.signal.aborted) {
            return;
          }

          setLoading(false);
        });
    }

    return () => {
      abortController.abort();
    };
  }, [trigger]);

  const handleClick = useCallback(() => {
    setTrigger((prev) => prev + 1);
  }, []);

  return (
    <ButtonComponent
      onClick={handleClick}
      disabled={loading || disabled}
      pending={loading}
      ref={ref}
    >
      {children}
    </ButtonComponent>
  );
}

/**
 * The FrogSearchButton allows a frog confetti animation when the button is disabled.
 */
export const FrogSearchButton = forwardRef(
  (
    {
      disabled,
      children,
      ...props
    }: React.ComponentPropsWithRef<typeof Button>,
    buttonRef: React.Ref<HTMLButtonElement>
  ) => {
    const ref = useRef<HTMLDivElement>(null);
    const container = useFrogParticles(ref);

    useEffect(() => {
      if (!container) {
        return;
      }

      if (disabled) {
        container.start();
      }

      // nb: we always need this so we can disable animation when button starts as
      // enabled
      return () => {
        container.stop();
      };
    }, [container, disabled]);

    return (
      <div
        style={{
          display: "flex",
          alignItems: "stretch"
        }}
        ref={ref}
      >
        <Button disabled={disabled} {...props} ref={buttonRef}>
          {children}
        </Button>
      </div>
    );
  }
);

export const Button = styled.button<{ pending?: boolean }>`
  font-size: 16px;
  padding: 8px;
  border: none;
  border-radius: 4px;
  background-color: var(--bg-lite-primary);
  color: var(--white);
  cursor: pointer;
  flex: 1;
  user-select: none;
  font-family: monospace;

  &:disabled {
    background-color: rgba(var(--white-rgb), 0.2);
    filter: drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.25));
    cursor: ${(props) => (props.pending ? "wait" : "unset")};
  }
`;

export const ButtonGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const TheCapitalSearchButton = forwardRef(
  (
    { children, ...props }: React.ComponentPropsWithRef<typeof Button>,
    buttonRef: React.Ref<HTMLButtonElement>
  ) => {
    return (
      <ParallaxProvider>
        <FrogSearchButton
          {...props}
          ref={buttonRef}
          style={{
            padding: 0,
            filter: props.disabled ? "brightness(80%)" : ""
          }}
        >
          <ParallaxBanner
            layers={[
              {
                image: "/images/frogs/thecapital.jpg",
                speed: -10,
                style: {
                  filter: props.disabled ? "brightness(30%)" : "brightness(50%)"
                },
                shouldAlwaysCompleteAnimation: true
              },
              {
                children: (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                      height: "100%"
                    }}
                  >
                    <div>{children}</div>
                  </div>
                )
              }
            ]}
            style={{ height: "48px", borderRadius: "4px" }}
          ></ParallaxBanner>
        </FrogSearchButton>
      </ParallaxProvider>
    );
  }
);

const TextureSearchButton = forwardRef(
  (
    {
      backgroundImage,
      children,
      buttonStyle,
      ...props
    }: React.ComponentPropsWithRef<typeof Button> & {
      backgroundImage: string;
      buttonStyle?: CSSProperties;
    },
    buttonRef: React.Ref<HTMLButtonElement>
  ) => {
    return (
      <FrogSearchButton
        {...props}
        ref={buttonRef}
        style={{
          backgroundImage,
          backgroundRepeat: "repeat",
          filter: props.disabled ? "brightness(70%)" : "",
          padding: "8px",
          ...buttonStyle
        }}
      >
        {children}
      </FrogSearchButton>
    );
  }
);

export const DesertSearchButton = forwardRef(
  (
    props: React.ComponentPropsWithRef<typeof TextureSearchButton>,
    buttonRef: React.Ref<HTMLButtonElement>
  ) => {
    return (
      <TextureSearchButton
        ref={buttonRef}
        backgroundImage="url(/images/frogs/desert.jpg)"
        {...props}
      />
    );
  }
);

export const JungleSearchButton = forwardRef(
  (
    props: React.ComponentPropsWithRef<typeof TextureSearchButton>,
    buttonRef: React.Ref<HTMLButtonElement>
  ) => {
    return (
      <TextureSearchButton
        ref={buttonRef}
        backgroundImage="url(/images/frogs/jungle.jpg)"
        {...props}
      />
    );
  }
);

export const CelestialPondSearchButton = forwardRef(
  (
    {
      children,
      ...props
    }: React.ComponentPropsWithRef<typeof TextureSearchButton>,
    buttonRef: React.Ref<HTMLButtonElement>
  ) => {
    const ref = useRef<HTMLDivElement>(null);
    useCelestialPondParticles(ref);

    return (
      <TextureSearchButton
        ref={buttonRef}
        backgroundImage="url(/images/frogs/celestialpond.jpg)"
        buttonStyle={{
          padding: 0
        }}
        {...props}
      >
        <div style={{ position: "relative", width: "100%", height: "48px" }}>
          <div
            ref={ref}
            style={{
              width: "100%",
              height: "100%",
              position: "absolute",
              left: 0,
              right: 0
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              transform: "translateY(-50%)",
              width: "100%",
              textAlign: "center"
            }}
          >
            {children}
          </div>
        </div>
      </TextureSearchButton>
    );
  }
);

export const WrithingVoidSearchButton = forwardRef(
  (
    {
      children,
      onClick,
      ...props
    }: React.ComponentPropsWithRef<typeof TextureSearchButton>,
    buttonRef: React.Ref<HTMLButtonElement>
  ) => {
    const ref = useRef<HTMLDivElement>(null);
    const animate = useWrithingVoidParticles(ref);
    const [animating, setAnimating] = useState(false);
    const onClickAnimated = useCallback(async () => {
      setAnimating(true);
      let container;
      try {
        container = await animate();
      } catch {
        console.error("Unable to start animation");
      }

      await onClick();

      setTimeout(() => {
        setAnimating(false);

        try {
          if (container && !container.destroyed) {
            container.destroy();
          }
        } catch {
          console.debug("Failed to destroy container");
        }
      }, 25 * 1000);
    }, [animate, onClick]);

    return (
      <>
        <TextureSearchButton
          ref={buttonRef}
          backgroundImage="url(/images/frogs/writhingvoid.png)"
          buttonStyle={{
            padding: 0,
            backgroundColor: "black",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center center"
          }}
          onClick={onClickAnimated}
          {...props}
        >
          <div style={{ position: "relative", width: "100%", height: "48px" }}>
            <div
              ref={ref}
              style={{
                width: "100%",
                height: "100%",
                position: "absolute",
                left: 0,
                right: 0
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "50%",
                transform: "translateY(-50%)",
                width: "100%",
                textAlign: "center"
              }}
            >
              {children}
            </div>
          </div>
        </TextureSearchButton>
        <WrithingVoidCover visible={animating}>
          <WrithingImage visible={animating} />
        </WrithingVoidCover>
      </>
    );
  }
);

const WrithingVoidCover = styled.div<{ visible: boolean }>`
  pointer-events: none;
  position: fixed;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 2000;

  display: flex;
  align-items: center;
  justify-content: center;

  background-color: ${({ visible }) => (visible ? "#000000" : "transparent")};
  transition: ${({ visible }) =>
    visible
      ? "background-color 4s ease-in"
      : "background-color 3s ease-out 1s"};
`;

const rotating = keyframes`
  from {
    -ms-transform: rotate(0deg);
    -moz-transform: rotate(0deg);
    -webkit-transform: rotate(0deg);
    -o-transform: rotate(0deg);
    transform: rotate(0deg);
  }
  to {
    -ms-transform: rotate(360deg);
    -moz-transform: rotate(360deg);
    -webkit-transform: rotate(360deg);
    -o-transform: rotate(360deg);
    transform: rotate(360deg);
  }
`;

const pulse = keyframes`
	0% { box-shadow: 0 0 0 0  rgba(255,255,255,0.2) inset, 0 0 0 0  rgba(255,255,255,0.2);
  opacity: 100% }
	47% { box-shadow: 0 0 10px 5px rgba(255,255,255,0.80) inset, 0 0 20px 10px rgba(255,255,255, 1);
  opacity: 100% }
	50% { box-shadow: 0 0 10px 5px rgba(255,255,255,0.80) inset, 0 0 20px 10px rgba(255,255,255, 1);
  opacity: 60% }
	53% { box-shadow: 0 0 10px 5px rgba(255,255,255,0.80) inset, 0 0 20px 10px rgba(255,255,255, 1);
  opacity: 100% }
	100% { box-shadow: 0 0 0 rgba(255,255,255,0.2) inset, 0 0 0 rgba(255,255,255,0.2);
  opacity: 100% }
`;

const WrithingImage = styled.div<{ visible: boolean }>`
  background-image: url("/images/frogs/writhingvoid.png");
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center center;

  border-radius: 50%;

  opacity: ${({ visible }) => (visible ? "100%" : "20%")};
  width: ${({ visible }) => (visible ? "min(80vw, 80vh)" : "0")};
  height: ${({ visible }) => (visible ? "min(80vw, 80vh)" : "0")};
  box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.2) inset,
    0 0 0 0 rgba(255, 255, 255, 0.2);

  transition: ${({ visible }) =>
    visible
      ? "width 16s ease-in, height 16s ease-in, opacity 4s ease-in"
      : "all 4s cubic-bezier(1,0,1,.6)"};
  animation: ${rotating} 600s linear infinite,
    ${pulse} 8s linear ${({ visible }) => (visible ? "16s infinite" : "0")};
  -webkit-animation: ${rotating} 600s linear infinite,
    ${pulse} 8s linear ${({ visible }) => (visible ? "16s infinite" : "0")};
`;
