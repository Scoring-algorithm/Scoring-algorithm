export default function ErrorMessage({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: 16,
        background: '#fee2e2',
        color: '#991b1b',
        borderRadius: 8,
        border: '1px solid #fca5a5',
      }}
    >
      {text}
    </div>
  );
}