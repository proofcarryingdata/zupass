import { Spacer } from "@pcd/passport-ui";
import { ReactNode, useState } from "react";
import { NewButton } from "../../NewButton";
import { H1, Placeholder, ZuLogo } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";

export interface ZKAction {
  title: string;
  to: string;
}

export interface ZKState {
  id: string;
  description: string;
  actions?: ZKAction[];
}

interface ZKComponentProps {
  currentState: ZKState;
  setZKState: (state: ZKState) => void;
  allZKStates: ZKState[];
}

export const ZKComponent: React.FC<ZKComponentProps> = ({
  currentState,
  setZKState,
  allZKStates
}) => {
  return (
    <div className="border-4 border-black bg-white p-4 text-black mt-2 rounded-lg">
      <div className="mb-2">{currentState.description}</div>
      {currentState.actions && currentState.actions.length > 0 && (
        <div className="flex flex-col gap-2 ">
          {currentState.actions.map((action, index) => (
            <NewButton
              className="text-white"
              key={index}
              onClick={() => {
                const nextState = allZKStates.find(
                  (state) => state.id === action.to
                );
                if (nextState) {
                  setZKState(nextState);
                }
              }}
            >
              {action.title}
            </NewButton>
          ))}
        </div>
      )}
    </div>
  );
};

const states: ZKState[] = [
  {
    id: "start",
    description:
      "Welcome to the ZK Proof Adventure! Ready to learn about Zero Knowledge Proofs?",
    actions: [
      {
        title: "Let's go!",
        to: "zk-1"
      },
      {
        title: "What's ZK?",
        to: "zk-intro"
      }
    ]
  },
  {
    id: "zk-intro",
    description:
      "ZK stands for Zero Knowledge. It's a concept in cryptography that allows one party to prove to another that a statement is true, without revealing any information beyond the validity of the statement itself.",
    actions: [
      {
        title: "Sounds intriguing!",
        to: "zk-1"
      },
      {
        title: "Who invented this?",
        to: "zk-history"
      }
    ]
  },
  {
    id: "zk-history",
    description:
      "Zero Knowledge Proofs were first conceived by Shafi Goldwasser, Silvio Micali, and Charles Rackoff in a 1985 paper titled 'The Knowledge Complexity of Interactive Proof-Systems'.",
    actions: [
      {
        title: "Interesting! Let's continue",
        to: "zk-1"
      },
      {
        title: "Go back to start",
        to: "start"
      }
    ]
  },
  {
    id: "zk-1",
    description:
      "A Zero Knowledge Proof is like magic! It lets you prove you know something without revealing what that something is.",
    actions: [
      {
        title: "Sounds mysterious...",
        to: "zk-2"
      },
      {
        title: "Can you give an example?",
        to: "zk-example"
      },
      {
        title: "Is it really secure?",
        to: "zk-security"
      }
    ]
  },
  {
    id: "zk-2",
    description:
      "Imagine you could prove you're old enough to vote without revealing your actual age. That's the power of ZK Proofs!",
    actions: [
      {
        title: "That's cool! How does it work?",
        to: "zk-3"
      },
      {
        title: "Any real-world applications?",
        to: "zk-applications"
      },
      {
        title: "Go back",
        to: "zk-1"
      }
    ]
  },
  {
    id: "zk-3",
    description:
      "ZK Proofs use complex math to create a proof that can be verified without revealing the underlying information.",
    actions: [
      {
        title: "Tell me more about the math",
        to: "zk-math"
      },
      {
        title: "Sounds complicated...",
        to: "zk-4"
      },
      {
        title: "Go back",
        to: "zk-2"
      }
    ]
  },
  {
    id: "zk-math",
    description:
      "ZK proofs often involve advanced mathematical concepts like elliptic curve cryptography, polynomial commitments, and interactive proof systems. It's a fascinating field of study!",
    actions: [
      {
        title: "Wow, that's complex!",
        to: "zk-4"
      },
      {
        title: "Go back",
        to: "zk-3"
      }
    ]
  },
  {
    id: "zk-4",
    description:
      "Don't worry! You don't need to understand the math. Just know that ZK Proofs are secure, private, and really useful!",
    actions: [
      {
        title: "What are they used for?",
        to: "zk-5"
      },
      {
        title: "How does Zupass use ZK?",
        to: "zk-zupass"
      },
      {
        title: "Go back",
        to: "zk-3"
      }
    ]
  },
  {
    id: "zk-5",
    description:
      "ZK Proofs are used in cryptocurrencies, voting systems, and even in Zupass to prove things about yourself without oversharing!",
    actions: [
      {
        title: "Tell me about crypto use",
        to: "zk-crypto"
      },
      {
        title: "That's amazing!",
        to: "zk-end"
      },
      {
        title: "Go back",
        to: "zk-4"
      }
    ]
  },
  {
    id: "zk-example",
    description:
      "Here's a fun example: Imagine proving you can solve a Rubik's cube without showing the solution. You mix it up, solve it behind your back, then show it solved!",
    actions: [
      {
        title: "I get it now!",
        to: "zk-2"
      },
      {
        title: "Another example?",
        to: "zk-example-2"
      },
      {
        title: "Go back",
        to: "zk-1"
      }
    ]
  },
  {
    id: "zk-example-2",
    description:
      "Here's another: Proving you know where Waldo is in a picture without pointing to him. You could cut out Waldo, show the hole matches the picture perfectly, all without revealing Waldo's location!",
    actions: [
      {
        title: "Clever! Let's continue",
        to: "zk-2"
      },
      {
        title: "Go back",
        to: "zk-example"
      }
    ]
  },
  {
    id: "zk-security",
    description:
      "Yes, ZK proofs are highly secure! They're based on complex mathematical problems that are extremely difficult to solve without the secret information.",
    actions: [
      {
        title: "Impressive! Continue",
        to: "zk-2"
      },
      {
        title: "Go back",
        to: "zk-1"
      }
    ]
  },
  {
    id: "zk-applications",
    description:
      "ZK proofs have many applications! They're used in privacy-preserving cryptocurrencies, secure voting systems, and even in proving ownership of digital assets without revealing the asset itself.",
    actions: [
      {
        title: "Fascinating! Tell me more",
        to: "zk-3"
      },
      {
        title: "Go back",
        to: "zk-2"
      }
    ]
  },
  {
    id: "zk-zupass",
    description:
      "Zupass uses ZK proofs to allow users to prove certain attributes about themselves (like age or membership) without revealing unnecessary personal information. It's privacy-preserving identity at its best!",
    actions: [
      {
        title: "That's cool! Continue",
        to: "zk-5"
      },
      {
        title: "Go back",
        to: "zk-4"
      }
    ]
  },
  {
    id: "zk-crypto",
    description:
      "In cryptocurrencies, ZK proofs enable private transactions. For example, Zcash uses ZK-SNARKs to allow fully encrypted transactions on the blockchain, hiding the sender, recipient, and amount.",
    actions: [
      {
        title: "Impressive! What's next?",
        to: "zk-end"
      },
      {
        title: "Go back",
        to: "zk-5"
      }
    ]
  },
  {
    id: "zk-end",
    description:
      "Congratulations! You've completed the ZK Proof Adventure. Remember, with ZK Proofs, you can prove it without showing it!",
    actions: [
      {
        title: "Start over",
        to: "start"
      },
      {
        title: "Learn more about ZK",
        to: "zk-resources"
      }
    ]
  },
  {
    id: "zk-resources",
    description:
      "Want to dive deeper? Check out resources like the ZKProof Standards website, the Zero Knowledge Podcast, or academic papers on the subject. The world of ZK is vast and exciting!",
    actions: [
      {
        title: "Thanks! Start over",
        to: "start"
      }
    ]
  }
];

export function ZKScreen(): ReactNode {
  const [currentZKState, setCurrentZKState] = useState<ZKState>(states[0]);

  return (
    <>
      <MaybeModal />
      <AppContainer bg="gray">
        <Spacer h={24} />
        <div className="flex-row flex align-center items-center gap-3">
          <ZuLogo width="48px" /> <H1 className="">Zupass</H1>
        </div>
        <Spacer h={24} />
        <Placeholder minH={540}>
          <NewButton
            onClick={() => {
              window.location.href = "#/more";
            }}
          >
            Back
          </NewButton>
          <ZKComponent
            currentState={currentZKState}
            setZKState={setCurrentZKState}
            allZKStates={states}
          />
        </Placeholder>
        <Spacer h={24} />
      </AppContainer>
    </>
  );
}
