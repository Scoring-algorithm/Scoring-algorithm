export default function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
      {text}
    </div>
  );
}