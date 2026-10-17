import * as React from 'react'
import { Body, Button, Container, Head, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface BookingConfirmationProps {
  subject?: string; accent?: string; workshop?: string; tag?: string; headline?: string; hi?: string
  rows?: { k: string; v: string }[]; tip?: string; cta?: string; link?: string; bye?: string; lang?: string
}

const Email = ({ accent = '#f26b1d', workshop = 'AutoJackie', tag = 'Jackie booked you in', headline = 'Your drop-off time is booked.', hi = 'Hi,', rows = [], tip = '', cta = 'Open My visits', link = 'https://auto-jackie.lovable.app', bye = 'See you soon!', lang = 'en' }: BookingConfirmationProps) => (
  <Html lang={lang} dir="ltr">
    <Head />
    <Preview>{headline}</Preview>
    <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif', margin: 0, padding: '24px 12px' }}>
      <Container style={{ maxWidth: 520, border: '1px solid #ebe5de', borderRadius: 18, overflow: 'hidden' }}>
        <Section style={{ background: accent, padding: '24px 28px', color: '#ffffff' }}>
          <table role="presentation"><tbody><tr>
            <td style={{ width: 40, height: 40, background: '#ffffff', borderRadius: 11, textAlign: 'center', verticalAlign: 'middle', color: accent, fontWeight: 800, fontSize: 22 }}>J</td>
            <td style={{ paddingLeft: 12, fontSize: 18, fontWeight: 700, color: '#ffffff' }}>{workshop}</td>
          </tr></tbody></table>
          <Text style={{ margin: '18px 0 0', fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', color: '#ffffff', opacity: 0.85 }}>{tag}</Text>
          <Text style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 700, lineHeight: '1.25', color: '#ffffff' }}>{headline}</Text>
        </Section>
        <Section style={{ padding: '24px 28px' }}>
          <Text style={{ margin: '0 0 12px', fontSize: 16, color: '#1f1d1b' }}>{hi}</Text>
          <table role="presentation" style={{ width: '100%', borderTop: '1px solid #f0ebe5', borderBottom: '1px solid #f0ebe5' }}><tbody>
            {rows.filter(r => r.v).map(r => <tr key={r.k}>
              <td style={{ padding: '10px 0', color: '#8a8580', fontSize: 13, textTransform: 'uppercase', letterSpacing: '.06em', width: 110 }}>{r.k}</td>
              <td style={{ padding: '10px 0', fontSize: 16, color: '#1f1d1b', fontWeight: 700 }}>{r.v}</td>
            </tr>)}
          </tbody></table>
          {tip && <Text style={{ margin: '18px 0', fontSize: 15, color: '#4a4642', lineHeight: '1.5' }}>{tip}</Text>}
          <Button href={link} style={{ background: accent, color: '#ffffff', fontWeight: 700, padding: '12px 22px', borderRadius: 999, textDecoration: 'none' }}>{cta}</Button>
        </Section>
        <Section style={{ padding: '16px 28px', background: '#faf8f5' }}>
          <Text style={{ margin: 0, color: '#8a8580', fontSize: 12 }}>{bye} · <span style={{ color: '#f26b1d', fontWeight: 700 }}>AutoJackie</span></Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => (typeof d['subject'] === 'string' && d['subject']) || 'Your visit is booked',
  displayName: 'Booking confirmation',
  previewData: { workshop: 'Demo Verkstad', hi: 'Hi Ana,', rows: [{ k: 'Drop-off', v: 'Monday 20 October, 08:00' }, { k: 'Job', v: 'Brake pads, front' }, { k: 'Car', v: 'Volvo V70' }], tip: 'Bring your car, your key and nothing to worry about.' },
} satisfies TemplateEntry
