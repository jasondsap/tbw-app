import { Amplify } from 'aws-amplify'

export function configureAmplify() {
  Amplify.configure(
    {
      Auth: {
        Cognito: {
          userPoolId:       process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
          userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
          loginWith: { email: true },
          signUpVerificationMethod: 'code',
          passwordFormat: {
            minLength: 10,
            requireLowercase: true,
            requireUppercase: true,
            requireNumbers: true,
            requireSpecialCharacters: true,
          },
        },
      },
    },
    { ssr: true }
  )
}
