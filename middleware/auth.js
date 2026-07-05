import { getAuth } from "firebase-admin/auth";

export const verifyToken = async (req, res, next) => {
    try {
        // grab authorization header from the incoming request.
        const authHeader = req.headers.authorization;

        // check if it exists and starts with "bearer"
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        //extract the token part from the string "Bearer <token>"
        const token = authHeader.split(' ')[1];

        // Verify the token from firebase
        const decodedToken = await getAuth().verifyIdToken(token);

        //If it's valid, Firebase gives us the user's info. 
        // We attach their unique user ID (uid) to the `req` object for our routes to use!
        req.user = { uid: decodedToken.uid };

        // 6. Tell Express to move on to the actual route handler
        console.log("token verified successfully");
        next();
    } catch (error) {
        console.error("Token verification failed:", error);
        return res.status(401).json({ message: "Invalid token. Unauthorized" })
    }
}