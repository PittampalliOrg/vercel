import NextAuth from "next-auth"

// This is a placeholder auth configuration
// Replace with your actual auth configuration
export const { auth, handlers } = NextAuth({
  providers: [],
  pages: {
    signIn: "/login",
  },
})

// For compatibility with older code
export const authOptions = {
  providers: [],
  pages: {
    signIn: "/login",
  },
}

