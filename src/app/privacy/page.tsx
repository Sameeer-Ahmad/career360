import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      lastUpdated="August 26, 2026"
      intro="This policy explains what information Career360 collects, how it's used, and the choices you have — described accurately for what Career360 actually does, not generic boilerplate."
    >
      <LegalSection number={1} title="Introduction">
        <p>
          Career360 (&ldquo;Career360,&rdquo; &ldquo;we,&rdquo; or &ldquo;us&rdquo;) is a job-search workspace that
          helps you track applications, analyze job postings, tailor resumes, draft cover letters, and prepare for
          interviews. This policy covers the information we collect when you use Career360 and how we handle it.
        </p>
      </LegalSection>

      <LegalSection number={2} title="Information We Collect">
        <p>We collect information in three ways:</p>
        <ul>
          <li>
            <strong>Account information.</strong> If you sign up with email and password, we store your name, email
            address, and a securely hashed version of your password — we never store your password itself. If you
            sign in with Google, we receive your name, email address, and profile picture from Google.
          </li>
          <li>
            <strong>Content you provide.</strong> Applications you track (company, role, status, priority, job
            description), resumes and other documents you upload or write, tailored resume versions, generated cover
            letters, learning paths, and messages you send to the AI Assistant.
          </li>
          <li>
            <strong>Google Calendar data, if you connect it.</strong> If you choose to connect Google Calendar, we
            store the access needed to create, read, and remove the interview and follow-up events Career360 itself
            creates on your calendar, plus the connected Google account&apos;s email address for display purposes.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number={3} title="How We Use Your Information">
        <p>We use the information above to:</p>
        <ul>
          <li>Provide the features you use — application tracking, job analysis, resume analysis and tailoring, cover letter generation, learning paths, and the AI Assistant.</li>
          <li>Authenticate you and keep your account secure.</li>
          <li>Sync interviews and follow-ups to Google Calendar, if you&apos;ve connected it, and search for relevant learning resources for your learning paths.</li>
          <li>Maintain and improve the reliability of the service.</li>
        </ul>
        <p>We do not use your data for advertising, and we do not sell your information.</p>
      </LegalSection>

      <LegalSection number={4} title="AI Processing and Third-Party AI Providers">
        <p>
          Career360&apos;s AI features are built on third-party AI providers, not our own models. When you use Job
          Analysis, Resume Analysis, Resume Tailoring, or Cover Letter generation, the relevant resume content, job
          description, and application context are sent to{" "}
          <strong>Google Gemini</strong> to generate the response. When you use the AI Assistant chat, your messages
          and any application context you&apos;re asking about are sent to <strong>Groq</strong> to generate a reply.
        </p>
        <p>
          These providers process your request to return a result to Career360 — we don&apos;t control their internal
          retention practices, and we encourage you to review their own privacy policies if you want details beyond
          what&apos;s described here. Career360&apos;s AI features are designed to work only from the resume and job
          description you provide, and are instructed not to invent experience, skills, or qualifications that
          aren&apos;t already there.
        </p>
      </LegalSection>

      <LegalSection number={5} title="Google Sign-In and Google Calendar">
        <p>
          Google Sign-In and Google Calendar are separate, independent connections with different scopes. Signing in
          with Google only shares your basic profile (name, email, picture) — it does not grant access to your
          calendar. Connecting Google Calendar is a separate, optional step with its own consent screen, scoped only
          to events Career360 itself creates (it cannot read or modify your other calendar events). You can
          disconnect Google Calendar at any time from within Career360, which removes the stored connection.
        </p>
      </LegalSection>

      <LegalSection number={6} title="Resume and Document Uploads">
        <p>
          When you upload a resume file (PDF, DOCX, or LaTeX), Career360 extracts the text from it to show you for
          review before saving. <strong>The original uploaded file is never stored</strong> — it exists only in
          memory for the duration of that request. Only the text you confirm gets saved to your account.
        </p>
      </LegalSection>

      <LegalSection number={7} title="Cookies and Local Storage">
        <p>
          Career360 uses a session cookie to keep you signed in — this is required for the service to function and
          isn&apos;t used for tracking or advertising. Your light/dark theme preference is stored in your
          browser&apos;s local storage and never leaves your device.
        </p>
      </LegalSection>

      <LegalSection number={8} title="Data Storage and Security">
        <p>
          Your data is stored in Career360&apos;s database, scoped to your account — every read and write is checked
          against your authenticated user, so your applications, documents, and AI-generated content are never
          accessible to other users. Passwords are hashed using scrypt before storage; we never store or log
          plaintext passwords.
        </p>
      </LegalSection>

      <LegalSection number={9} title="How We Share Information">
        <p>We share information only as necessary to provide the service:</p>
        <ul>
          <li>With Google, for Google Sign-In and, if connected, Google Calendar.</li>
          <li>With Google Gemini and Groq, to generate AI analysis, tailored content, and chat responses as described above.</li>
          <li>With YouTube&apos;s public data API, to search for relevant learning videos for your learning paths (only topic/skill search terms are sent — not your personal information).</li>
        </ul>
        <p>We do not sell your data, and we do not share it with advertisers or data brokers.</p>
      </LegalSection>

      <LegalSection number={10} title="Data Retention">
        <p>
          We retain your account and content for as long as your account is active, so your applications and
          documents remain available to you. If you&apos;d like your account or data deleted, contact us using the
          details below and we&apos;ll process the request — Career360 doesn&apos;t yet have a self-serve account
          deletion option built into the product.
        </p>
      </LegalSection>

      <LegalSection number={11} title="Your Rights and Choices">
        <p>
          You can review and edit most of your information directly within Career360 — your applications, documents,
          and generated content are all editable. For anything not yet self-serve, including access requests,
          corrections, or deletion, contact us and we&apos;ll help.
        </p>
      </LegalSection>

      <LegalSection number={12} title="Children's Privacy">
        <p>
          Career360 is intended for people who are old enough to be job-searching and is not directed at children. We
          do not knowingly collect information from children.
        </p>
      </LegalSection>

      <LegalSection number={13} title="Changes to This Policy">
        <p>
          If we make material changes to this policy, we&apos;ll update the &ldquo;Last updated&rdquo; date above.
          Continuing to use Career360 after a change means you accept the updated policy.
        </p>
      </LegalSection>

      <LegalSection number={14} title="Contact Us">
        <p>
          Questions about this policy or your data? Email us at{" "}
          <a href="mailto:support@career360.app">support@career360.app</a>.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
