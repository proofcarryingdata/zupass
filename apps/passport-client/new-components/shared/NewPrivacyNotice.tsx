import { ZUPASS_SUPPORT_EMAIL } from "@pcd/util";
import styled from "styled-components";
import { Button2 } from "./Button";
import { Typography } from "./Typography";

export function NewPrivacyNoticeText(): JSX.Element {
  return (
    <Prose>
      <h2>ZUPASS PRIVACY NOTICE</h2>
      <p>
        <strong>Last Updated:</strong> October 24, 2023
      </p>
      <p>
        This privacy notice (“<strong>Privacy Notice</strong>”) describes how
        0xPARC Foundation (“<strong>we</strong>”, “<strong>us</strong>”, “
        <strong>our</strong>”) collects, uses and discloses information about
        you when you use our website{" "}
        <a href="https://zupass.org/">https://zupass.org</a> (the, “
        <strong>Website</strong>”), and the applications, services, tools and
        features available through the Website, or otherwise interact with us
        (collectively, the “<strong>Services</strong>”). For the purposes of
        this Privacy Notice, “<strong>you</strong>” and “<strong>your</strong>”
        means you as the user of the Services.
      </p>
      <p>
        Please read this Privacy Notice carefully. By using any of the Services,
        you agree to the collection, use, and disclosure of your information as
        described in this Privacy Notice. If you do not agree to this Privacy
        Notice, please do not use or access the Services.
      </p>
      <h3>1. CHANGES TO THIS PRIVACY NOTICE</h3>
      <p>
        We may modify this Privacy Notice from time to time, in which case we
        will update the “Last Updated” date at the top of this Privacy Notice.
        If we make material changes to how we use or disclose information we
        collect, we will use reasonable efforts to notify you (such as by
        emailing you at the last email address you provided us, by posting
        notice of such changes on the Services, or by other means consistent
        with applicable law) and will take additional steps as required by
        applicable law. If you do not agree to any updates to this Privacy
        Notice, please do not continue using or accessing the Services.
      </p>
      <h3>2. COLLECTION AND USE OF INFORMATION</h3>
      <p>
        When you use or access the Services, we collect certain categories of
        information about you from a variety of sources.
      </p>
      <p>
        <em>Information You Provide to Us</em>
      </p>
      <p>
        Some features of the Services may require you to directly provide
        certain information about yourself. You may elect not to provide this
        information, but doing so may prevent you from using or accessing these
        features. Information that you directly submit through our Services
        includes:
      </p>
      <ul>
        <li>
          Basic contact details, such as name and email address. We use this
          information to create and maintain your account, provide you with our
          Services, communicate with you about our Services, respond to your
          queries, and offer promotions and administer surveys.
        </li>
        <li>
          Account information, such as username and password. We use this
          information to create, maintain and secure your account. If you choose
          to register an account, you are responsible for keeping your account
          credentials safe. We recommend you do not share your access details
          with anyone else. If you choose not to set a password when you
          register an account, your data will be encrypted by a key stored on
          our server. If you believe your account has been compromised, please
          contact us immediately.
        </li>

        <li>
          User-generated content, such as photos, tickets, and other proof
          carrying data, submitted by you through our Services (“UGC”). You may
          have the ability to share UGC with third parties. If you choose to
          share UGC with any third parties, we are not responsible for what
          those third parties do with your UGC.
        </li>
        <li>
          Any other information you choose to include in communications with us,
          for example, when sending an email to us, such as for product support.
        </li>
      </ul>
      <p>
        <em>Information Collected Automatically</em>
      </p>
      <p>
        We may also use tracking technologies (including but not limited to
        Rollbar and Simple Analytics) to automatically collect certain
        information about your interactions with the Services. We collect and
        use this information to run analytics and better understand user
        interactions with the Services, etc. Such information includes:
      </p>
      <ul>
        <li>
          <strong>Device information</strong>, such as device type, operating
          system, unique device identifier, and internet protocol (IP) address.
        </li>
        <li>
          <strong>
            Time Zone may be used to infer country-level location information.
          </strong>
        </li>
        <li>
          <strong>
            Other information regarding your interaction with the Services, such
            as browser type
          </strong>
          , log data, date and time stamps, clickstream data, referral activity,
          and error data.
        </li>
      </ul>
      <p>
        Your browser settings may allow you to transmit a “Do Not Track” signal
        when you visit various websites. Like many websites, our Website is not
        designed to respond to “Do Not Track” signals received from browsers. To
        learn more about “Do Not Track” signals, you can visit{" "}
        <a href="http://www.allaboutdnt.com/">http://www.allaboutdnt.com/</a>.
      </p>
      <p>
        <em> Information Collected From Other Sources</em>
      </p>
      <p>
        We may obtain information about you from outside sources, including
        information that we collect directly from third parties and information
        from third parties that you choose to share with us. Such information
        includes:
      </p>
      <ul>
        <li>
          <strong>
            Event and conference ticket data from Devconnect and Zuzalu.
          </strong>
          Cryptographic credentials, such as tickets, will be automatically
          loaded onto the Services. You may also choose to manually retrieve
          data from other sources.
        </li>
        <li>
          <strong>Analytics data</strong> we receive from analytics providers
          such as Simple Analytics and Rollbar, which we use to improve our
          Website and the Services.
        </li>
      </ul>
      <p>
        Any information we receive from outside sources will be treated in
        accordance with this Privacy Notice. We are not responsible for the
        accuracy of the information provided to us by third parties and are not
        responsible for any third party’s policies or practices. For more
        information, see the section below,
        <em>Third Party Websites and Links</em>.
      </p>
      <p>
        In addition to the specific uses described above, we may use any of the
        above information to provide you with the Services and to maintain our
        business relationship, including by enhancing the safety and security of
        our Services (e.g., troubleshooting, data analysis, testing, system
        maintenance, and reporting), providing customer support, sending service
        and other non-marketing communications, monitoring and analyzing trends,
        conducting internal research and development, complying with applicable
        legal obligations, and protecting the Services, our rights, and the
        rights of our employees, users or other individuals.
      </p>
      <h3>3. DISCLOSURE OF YOUR INFORMATION</h3>
      <p>
        We may share aggregated or de-identified information about our users
        without restriction. We may disclose your information for legitimate
        purposes subject to this Privacy Notice, including the following
        categories of third parties:
      </p>
      <ul>
        <li>
          Vendors or other service providers who help us provide the Services,
          including for system administration, hosted infrastructure providers,
          security, and web analytics.
        </li>
        <li>
          Our credentialing partners, such as Devconnect, Zuconnect, and Zuzalu.
        </li>
        <li>
          Third parties to whom you request or direct us to disclose
          information, such as through your use of subscriptions.
        </li>
        <li>
          Professional advisors, such as auditors, law firms, or accounting
          firms to assess, protect, enforce and defend our rights and to comply
          with our legal and regulatory obligations.
        </li>
        <li>
          Third parties in connection with or anticipation of an asset sale,
          merger, bankruptcy, or other business transaction.
        </li>
      </ul>
      <p>
        We may also disclose your information as needed to comply with
        applicable law or any obligations thereunder or to cooperate with law
        enforcement, judicial orders, and regulatory inquiries, and to ensure
        the safety and security of our business, employees, and users.
      </p>
      <h3>4. THIRD PARTY WEBSITES AND LINKS</h3>
      <p>
        We may provide links to third-party websites or platforms. If you follow
        links to sites or platforms that we do not control and are not
        affiliated with us, you should review the applicable privacy notice,
        policies and other terms. We are not responsible for the privacy or
        security of, or information found on, these sites or platforms. Our
        inclusion of such links does not, by itself, imply any endorsement of
        the content on such platforms or of their owners or operators.
      </p>
      <h3>5. CHILDREN’S PRIVACY</h3>
      <p>
        Our Services are not intended for children, and we do not seek or
        knowingly collect any personal information about children. If we become
        aware that we have unknowingly collected information about a child, in
        particular any child under 13 years of age, we will make commercially
        reasonable efforts to delete such information from our database. If you
        are the parent or guardian of a child under 13 years of age who has
        provided us with their personal information, you may contact us using
        the below information to request that it be deleted.
      </p>
      <h3>6.DATA SECURITY</h3>
      <p>
        Despite our reasonable efforts to protect your information, no security
        measures are impenetrable, and we cannot guarantee “perfect security.”
        Any information you send to us electronically, while using the Services
        or otherwise interacting with us, may not be secure while in transit. We
        recommend that you do not use unsecure channels to send us sensitive or
        confidential information.
      </p>
      <h3>7. PROCESSING IN THE UNITED STATES</h3>
      <p>
        Please be aware that your information and communications may be
        transferred to and maintained on servers or databases located outside
        your state, province, or country. If you are located outside of the
        United States, please be advised that we process and store all
        information in the United States. The laws in the United States may not
        be as protective of your privacy as those in your location. By using the
        Services, you are agreeing to the collection, use, transfer, and
        disclosure of your information and communications will be governed by
        the applicable laws in the United States.
      </p>
      <h3>8. HOW TO CONTACT US</h3>
      <p>
        Should you have any questions about our privacy practices or this
        Privacy Notice, please email us at <SupportLink />.
      </p>
    </Prose>
  );
}

export function TermsWithTitle({
  onAgree,
  title,
  loading
}: {
  title: string;
  onAgree?: () => void;
  loading?: boolean;
}): JSX.Element {
  return (
    <TermsContainer>
      <TitleContainer>
        <Typography fontSize={24} fontWeight={800}>
          {title}
        </Typography>
        {onAgree && (
          <Typography fontSize={16} fontWeight={400} family="Rubik">
            To continue using Zupass, please agree to the following terms:{" "}
          </Typography>
        )}
      </TitleContainer>
      <TermsContentContainer>
        <NewPrivacyNoticeText />
      </TermsContentContainer>
      {onAgree && (
        <Button2 onClick={onAgree} disabled={loading}>
          Agree
        </Button2>
      )}
    </TermsContainer>
  );
}

const TermsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 12px;
  margin-bottom: 24px;
`;

const TitleContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: start;
  justify-content: flex-start;
  padding: 12px;
`;

const TermsContentContainer = styled.div`
  background-color: white;
  padding: 16px 12px;
`;

const Prose = styled.div`
  * {
    color: black;
  }
  p {
    margin: 12px 0px;
  }

  h2 {
    margin: 0px 0px 12px 0px;
    font-weight: bold;
    text-align: center;
  }

  h3 {
    margin: 12px 0px;
    font-weight: bold;
  }

  ul {
    list-style-type: disc;
  }

  ul li {
    margin-left: 16px;
    padding-left: 4px;
    margin-bottom: 12px;
  }

  a {
    color: blue;
    text-decoration: underline;
  }
`;

const SupportLink = (): JSX.Element => {
  return <a href={`mailto:${ZUPASS_SUPPORT_EMAIL}`}>{ZUPASS_SUPPORT_EMAIL}</a>;
};
