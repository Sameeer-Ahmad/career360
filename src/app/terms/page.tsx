import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      lastUpdated="August 26, 2026"
      intro="These terms describe your agreement with Career360 when you use the service — written for what Career360 actually is, not a generic template."
    >
      <LegalSection number={1} title="Acceptance of Terms">
        <p>
          By creating a Career360 account or otherwise using the service, you agree to these Terms of Service. If you
          don&apos;t agree, please don&apos;t use Career360.
        </p>
      </LegalSection>

      <LegalSection number={2} title="Description of Service">
        <p>Career360 is a job-search workspace. It provides:</p>
        <ul>
          <li>Application tracking — company, role, status, priority, and job description in one place.</li>
          <li>Job Analysis — a breakdown of a job posting&apos;s requirements, skills, and interview focus areas.</li>
          <li>Resume Analysis and Tailoring — comparing your resume against a job description and helping you rewrite it to match.</li>
          <li>Cover Letter generation — an editable AI-drafted cover letter grounded in your resume and the job description.</li>
          <li>Learning Paths — a plan for closing specific skill gaps a role calls for.</li>
          <li>Interview and follow-up tracking, with optional Google Calendar sync.</li>
          <li>An AI Assistant for job-search and interview-prep questions.</li>
        </ul>
        <p>
          Career360 does not use a credit system, does not have a browser extension, and does not currently offer
          paid plans or subscriptions.
        </p>
      </LegalSection>

      <LegalSection number={3} title="Account Registration">
        <p>
          You can create an account with an email and password, or by signing in with Google. You&apos;re responsible
          for keeping your credentials secure and for all activity under your account. You must provide accurate
          information when creating your account.
        </p>
      </LegalSection>

      <LegalSection number={4} title="Acceptable Use">
        <p>When using Career360, you agree not to:</p>
        <ul>
          <li>Use the service for anything unlawful, or to submit false information you know to be false.</li>
          <li>Attempt to access another user&apos;s account or data.</li>
          <li>Interfere with or disrupt the service, or attempt to bypass its security or rate limits.</li>
          <li>Reverse engineer, scrape, or resell the service or its underlying AI-generated output at scale.</li>
        </ul>
      </LegalSection>

      <LegalSection number={5} title="Your Content">
        <p>
          You retain ownership of the resumes, job descriptions, and other content you provide to Career360. By using
          the service, you give Career360 permission to process that content — including sending relevant parts of
          it to the third-party AI providers described in our{" "}
          <Link href="/privacy">Privacy Policy</Link> — solely to provide the features you use.
        </p>
      </LegalSection>

      <LegalSection number={6} title="AI-Generated Content">
        <p>
          Job Analysis, Resume Analysis, tailored resume text, cover letters, and AI Assistant replies are all
          AI-generated drafts, grounded in the resume and job description you provide. They are designed not to
          invent experience, skills, achievements, or qualifications you haven&apos;t actually described — but AI
          output can still be imperfect. Nothing is sent, submitted, or shared on your behalf automatically:{" "}
          <strong>you</strong> decide whether to save, edit, copy, or use anything Career360 generates.
        </p>
        <p>
          Career360 does not guarantee interviews, job offers, or any other outcome from using AI-generated content,
          and you&apos;re responsible for reviewing it for accuracy before relying on it.
        </p>
      </LegalSection>

      <LegalSection number={7} title="Third-Party Services">
        <p>
          Career360 relies on third-party services to provide certain features: Google (Sign-In and, if you connect
          it, Calendar), Google Gemini and Groq (AI generation), and YouTube&apos;s data API (learning resource
          search). Your use of those integrations is also subject to the relevant provider&apos;s own terms.
        </p>
      </LegalSection>

      <LegalSection number={8} title="Intellectual Property">
        <p>
          Career360&apos;s branding, design, and software are owned by Career360. The content you provide — your
          resumes, applications, and generated documents — remains yours.
        </p>
      </LegalSection>

      <LegalSection number={9} title="Termination">
        <p>
          You may stop using Career360 at any time. We may suspend or terminate access to accounts that violate these
          terms, including the acceptable-use rules above.
        </p>
      </LegalSection>

      <LegalSection number={10} title="Disclaimers">
        <p>
          Career360 is provided &ldquo;as is,&rdquo; without warranties of any kind. We don&apos;t guarantee the
          service will be uninterrupted or error-free, and we don&apos;t guarantee any job-search outcome, including
          interviews or offers.
        </p>
      </LegalSection>

      <LegalSection number={11} title="Limitation of Liability">
        <p>
          To the extent permitted by law, Career360 isn&apos;t liable for indirect, incidental, or consequential
          damages arising from your use of the service, including decisions made based on AI-generated content.
        </p>
      </LegalSection>

      <LegalSection number={12} title="Changes to These Terms">
        <p>
          We may update these terms from time to time. If we make material changes, we&apos;ll update the &ldquo;Last
          updated&rdquo; date above. Continuing to use Career360 after a change means you accept the updated terms.
        </p>
      </LegalSection>

      <LegalSection number={13} title="Contact Us">
        <p>
          Questions about these terms? Email us at <a href="mailto:support@career360.app">support@career360.app</a>.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
