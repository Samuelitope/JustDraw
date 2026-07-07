import { db, storage } from "./firebase";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";

export const uploadDrawing = async (dataUrl, label = "drawing") => {
  const filename = `drawings/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
  const storageRef = ref(storage, filename);

  await uploadString(storageRef, dataUrl, 'data_url');

  const url = await getDownloadURL(storageRef);
  const docRef = await addDoc(collection(db, "drawings"), {
    url,
    label,
    createdAt: new Date(),
    source: "paint-app"
  });

  return { id: docRef.id, url, label };
};

export const getSavedDrawings = async () => {
  const drawingsQuery = query(collection(db, "drawings"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(drawingsQuery);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data())
  }));
};