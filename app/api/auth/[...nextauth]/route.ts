import NextAuth, { AuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { doc, setDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const authOptions: AuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }: any) {
      if (account) {
        token.accessToken = account.access_token;
        token.username = profile?.login || profile?.username;
        token.githubId = profile?.id?.toString();
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        (session as any).accessToken = token.accessToken;
        (session.user as any).username = token.username;
        (session.user as any).githubId = token.githubId;
      }
      return session;
    },
    async signIn({ user, account, profile }: any) {
      if (account?.provider === "github") {
        const githubId = profile?.id?.toString();
        const username = profile?.login;
        const email = user.email;
        const name = user.name;
        const photoURL = user.image;

        if (!email || !githubId || !username) {
          console.error("Missing required GitHub profile information", { email, githubId, username });
          return false; // Reject sign in
        }

        try {
          // Fetch user repositories from GitHub (all public & private)
          const reposResponse = await fetch("https://api.github.com/user/repos?per_page=100", {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
              "User-Agent": "ZeroOps",
            },
          });

          let repositories: any[] = [];
          if (reposResponse.ok) {
            const githubRepos = await reposResponse.json();
            if (Array.isArray(githubRepos)) {
              repositories = githubRepos.map((repo: any) => ({
                id: repo.id,
                name: repo.name,
                full_name: repo.full_name,
                html_url: repo.html_url,
                description: repo.description || "",
                language: repo.language || "",
                stargazers_count: repo.stargazers_count || 0,
                forks_count: repo.forks_count || 0,
                private: repo.private || false,
                created_at: repo.created_at || "",
                updated_at: repo.updated_at || "",
              }));
            }
          } else {
            console.error("Failed to fetch repositories from GitHub", await reposResponse.text());
          }

          // Check if user already exists in Firestore by githubId
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("githubId", "==", githubId));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            // Update existing user record (document ID is their email)
            const userDoc = querySnapshot.docs[0];
            const userRef = doc(db, "users", userDoc.id);
            await updateDoc(userRef, {
              email,
              username,
              name,
              photoURL,
              repositories,
              updatedAt: new Date().toISOString(),
            });
          } else {
            // Create a new user record keyed by email
            const userRef = doc(db, "users", email);
            await setDoc(userRef, {
              email,
              username,
              name,
              githubId,
              photoURL,
              repositories,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
          return true;
        } catch (error) {
          console.error("Error saving user to Firestore during sign in:", error);
          // Allow sign in even if Firestore fails (fail-safe fallback) but log the error
          return true;
        }
      }
      return true;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-zeroops-development",
  pages: {
    signIn: "/auth",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
