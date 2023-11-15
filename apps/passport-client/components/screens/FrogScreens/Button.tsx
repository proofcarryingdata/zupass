import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { useInView } from "react-intersection-observer";
import { ParallaxBanner, ParallaxProvider } from "react-scroll-parallax";
import styled from "styled-components";
import { useFrogParticles } from "./useFrogParticles";

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
  gap: 8px;
`;

export const TheCapitalSearchButton = forwardRef(
  (
    { children, ...props }: React.ComponentPropsWithRef<typeof Button>,
    buttonRef: React.Ref<HTMLButtonElement>
  ) => {
    return (
      <ParallaxProvider>
        <FrogSearchButton {...props} ref={buttonRef} style={{ padding: 0 }}>
          <ParallaxBanner
            layers={[
              {
                image: "/images/frogs/thecapital.jpg",
                speed: -10,
                style: {
                  filter: "brightness(50%)"
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
      ...props
    }: React.ComponentPropsWithRef<typeof Button> & {
      backgroundImage: string;
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
          backdropFilter: "brightness(60%)"
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
