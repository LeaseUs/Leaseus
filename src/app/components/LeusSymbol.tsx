export function L({ amount }: { amount?: string | number }) {
  return (
    <span>
      <span style={{ fontSize: '1.3em', fontWeight: '700', lineHeight: 1 }}><span className="leus">ᛃ</span></span>
      {amount !== undefined ? amount : ""}
    </span>
  );
}
