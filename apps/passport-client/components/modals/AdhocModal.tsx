import { ComponentProps } from "react";
import Modal from "react-responsive-modal";
import { createGlobalStyle } from "styled-components";

export function AdhocModal(props: ComponentProps<typeof Modal>) {
  return (
    <>
      <ModalStyle />
      <Modal {...props} />
    </>
  );
}

/**
 * https://raw.githubusercontent.com/pradel/react-responsive-modal/master/react-responsive-modal/styles.css
 */
const ModalStyle = createGlobalStyle`
.react-responsive-modal-root {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

.react-responsive-modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: -1;
}

.react-responsive-modal-container {
  height: 100%;
  outline: 0;
  overflow-x: hidden;
  overflow-y: auto;
  text-align: center;

  display: flex;
  align-items: flex-start;
  justify-content: center;
}

/* Used to trick the browser to center the modal content properly  */
.react-responsive-modal-containerCenter:after {
  width: 0;
  height: 100%;
  content: "";
  display: inline-block;
  vertical-align: middle;
}

.react-responsive-modal-modal {
  max-width: min(600px, calc(100vw - 32px));
  display: inline-block;
  text-align: left;
  vertical-align: middle;
  background: var(--bg-dark-primary);
  box-shadow: 0 12px 15px 0 rgba(0, 0, 0, 0.25);
  margin: 1.2rem;
  padding: 1.2rem;
  position: relative;
  overflow-y: auto;
}

.react-responsive-modal-closeButton {
  position: absolute;
  top: 0;
  right: 0;
  border: none;
  padding: 0;
  cursor: pointer;
  background-color: transparent;
  display: flex;
  filter: brightness(0) invert(1);
}

/* Used to fix a screen glitch issues with the animation see https://github.com/pradel/react-responsive-modal/issues/495 */
.react-responsive-modal-overlay,
.react-responsive-modal-container,
.react-responsive-modal-modal {
  animation-fill-mode: forwards !important;
}

@keyframes react-responsive-modal-overlay-in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes react-responsive-modal-overlay-out {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes react-responsive-modal-modal-in {
  0% {
    transform: scale(0.96);
    opacity: 0;
  }
  100% {
    transform: scale(100%);
    opacity: 1;
  }
}

@keyframes react-responsive-modal-modal-out {
  0% {
    transform: scale(100%);
    opacity: 1;
  }
  100% {
    transform: scale(0.96);
    opacity: 0;
  }
}
`;
