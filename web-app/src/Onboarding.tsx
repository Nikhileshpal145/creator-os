type OnboardingProps = {
  userId: string;
  onComplete: () => void;
};

export default function Onboarding({ userId, onComplete }: OnboardingProps) {
  return (
    <div style={{ padding: 40 }}>
      <h1>Welcome {userId || 'User'}</h1>
      <p>MVP mode – onboarding coming soon.</p>
      <button onClick={onComplete}>Continue</button>
    </div>
  );
}
