import { Link, useParams } from 'react-router-dom';
const T: Record<string, [string, string]> = {
  docs: ['Documentation', 'Setup steps and API notes are in the project README. This hackathon build runs PayPal in Sandbox only.'],
  privacy: ['Privacy', 'Hackathon prototype. Demo data stays in your browser; card details are never collected or stored by Pact AI.'],
  terms: ['Terms', 'Demonstration software using PayPal Sandbox. No real money moves. Provided as is, without warranty.'],
};
export default function Info() {
  const [t, p] = T[useParams().slug ?? ''] ?? ['Not found', 'This page doesn’t exist.'];
  return <div className="wrap" style={{ maxWidth: 560, paddingTop: '12vh' }}><Link className="logo" to="/"><i />Pact AI</Link><h1 style={{ fontSize: 40, margin: '28px 0 10px' }}>{t}</h1><p className="mu">{p}</p></div>;
}
