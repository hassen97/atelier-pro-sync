/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
  siteName?: string
}

export const ReauthenticationEmail = ({
  token,
  siteName = 'atelier-pro-sync',
}: ReauthenticationEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre code de vérification — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logoText}>{siteName}</Text>
        <Hr style={divider} />
        <Heading style={h1}>Confirmez votre identité</Heading>
        <Text style={text}>Utilisez le code ci-dessous pour confirmer votre identité :</Text>
        <div style={codeContainer}>
          <Text style={codeStyle}>{token}</Text>
        </div>
        <Hr style={divider} />
        <Text style={footer}>
          Ce code expire bientôt. Si vous n'avez pas demandé cette vérification,
          ignorez cet email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = {
  backgroundColor: 'hsl(210, 20%, 98%)',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
}
const container = {
  maxWidth: '520px',
  margin: '40px auto',
  backgroundColor: 'hsl(0, 0%, 100%)',
  borderRadius: '0.625rem',
  padding: '36px 40px',
  border: '1px solid hsl(214, 32%, 91%)',
}
const logoText = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: 'hsl(217, 91%, 40%)',
  margin: '0 0 4px',
}
const divider = { borderColor: 'hsl(214, 32%, 91%)', margin: '20px 0' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(215, 25%, 15%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(215, 16%, 47%)',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const codeContainer = {
  backgroundColor: 'hsl(210, 20%, 96%)',
  borderRadius: '0.5rem',
  padding: '16px 20px',
  margin: '0 0 20px',
  textAlign: 'center' as const,
}
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: 'hsl(217, 91%, 40%)',
  letterSpacing: '6px',
  margin: '0',
}
const footer = { fontSize: '12px', color: 'hsl(215, 16%, 60%)', margin: '0' }
