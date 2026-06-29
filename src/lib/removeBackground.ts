export async function removeBackground(image: Blob): Promise<Blob> {
  const { removeBackground: imglyRemoveBackground } = await import(
    "@imgly/background-removal"
  );

  return imglyRemoveBackground(image, {
    model: "isnet_quint8",
    output: {
      format: "image/png",
    },
  });
}
