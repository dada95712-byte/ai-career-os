import withAuth from 'next-auth/middleware'

export const proxy = withAuth

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/career-profile/:path*',
    '/work-journal/:path*',
    '/career-match/:path*',
    '/career-growth/:path*',
    '/interview-prep/:path*',
    '/career-coach/:path*',
    '/career-intelligence/:path*',
    '/profile-library/:path*',
  ],
}
