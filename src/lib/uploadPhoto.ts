import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

export async function pickAndUploadPhoto(): Promise<string> {
  // Request permission
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permission to access photos was denied');
  }

  // Pick image with base64 encoding
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
    base64: true,
  });

  if (result.canceled) {
    throw new Error('Cancelled');
  }

  const image = result.assets[0];

  if (!image.base64) {
    throw new Error('Failed to get image data');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Must be logged in to upload photos');
  }

  // Create file path: userId/timestamp.jpg
  const fileExt = image.uri.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;

  // Upload using ArrayBuffer from base64
  const { data, error } = await supabase.storage
    .from('post-photos')
    .upload(fileName, decode(image.base64), {
      contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
      upsert: false,
    });

  if (error) throw error;

  // Get public URL (bucket must be public for this to work)
  const {
    data: { publicUrl },
  } = supabase.storage.from('post-photos').getPublicUrl(data.path);

  console.log('Upload successful, path:', data.path);
  console.log('Public URL:', publicUrl);

  return publicUrl;
}

export async function takeAndUploadPhoto(): Promise<string> {
  // Request permission
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permission to access camera was denied');
  }

  // Take photo with base64 encoding
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
    base64: true,
  });

  if (result.canceled) {
    throw new Error('Cancelled');
  }

  const image = result.assets[0];

  if (!image.base64) {
    throw new Error('Failed to get image data');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Must be logged in to upload photos');
  }

  // Create file path: userId/timestamp.jpg
  const fileExt = 'jpg';
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;

  // Upload using ArrayBuffer from base64
  const { data, error } = await supabase.storage
    .from('post-photos')
    .upload(fileName, decode(image.base64), {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) throw error;

  // Get public URL (bucket must be public for this to work)
  const {
    data: { publicUrl },
  } = supabase.storage.from('post-photos').getPublicUrl(data.path);

  console.log('Camera upload successful, path:', data.path);
  console.log('Public URL:', publicUrl);

  return publicUrl;
}
