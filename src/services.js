import { db, storage } from "../firebase";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";

export const uploadDrawing = async (dataUrl) => {
  // 1. Crear referencia única en Storage
  const filename = `drawings/${Date.now()}.png`;
  const storageRef = ref(storage, filename);
  
  // 2. Subir imagen
  await uploadString(storageRef, dataUrl, 'data_url');
  
  // 3. Obtener URL y guardar en Firestore
  const url = await getDownloadURL(storageRef);
  await addDoc(collection(db, "drawings"), {
    url: url,
    createdAt: new Date()
  });
  
  return url;
};