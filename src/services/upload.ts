// Общие утилиты загрузки. Ключ ImgBB берётся из окружения, а не из кода.
export const compressImage = (file: File, maxWidth = 800): Promise<File> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onerror = reject;
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const width = img.width > maxWidth ? maxWidth : img.width;
        const height = img.width > maxWidth ? img.height * (maxWidth / img.width) : img.height;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) =>
            blob
              ? resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }))
              : reject(new Error('Ошибка сжатия изображения')),
          'image/jpeg',
          0.8
        );
      };
    };
  });

export const uploadToImgBB = async (file: File): Promise<string> => {
  const key = import.meta.env.VITE_IMGBB_API_KEY;
  if (!key) throw new Error('Не задан VITE_IMGBB_API_KEY');
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, { method: 'POST', body: formData });
  const data = await res.json();
  if (data.success) return data.data.url as string;
  throw new Error('Ошибка загрузки на ImgBB');
};

// Загрузка произвольных файлов (голосовые, документы) в Firebase Storage
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export const uploadToStorage = async (data: Blob | File, path: string): Promise<string> => {
  const r = ref(storage, path);
  await uploadBytes(r, data, data.type ? { contentType: data.type } : undefined);
  return getDownloadURL(r);
};
