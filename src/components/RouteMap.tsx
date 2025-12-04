import React from "react";
import { GoogleMap, DirectionsRenderer, useJsApiLoader } from "@react-google-maps/api";

type Props = {
  directions: any;
};

const containerStyle = {
  width: "100%",
  height: "400px",
};

const centerDefault = { lat: -23.55052, lng: -46.633308 }; // São Paulo

const RouteMap: React.FC<Props> = ({ directions }) => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "", // Precisa ser definida no .env
  });

  if (!isLoaded) return <div>Carregando mapa...</div>;
  if (!directions) return <div>Rota não encontrada.</div>;

  const center = directions?.legs?.[0]?.start_location || centerDefault;

  return (
    <GoogleMap mapContainerStyle={containerStyle} zoom={13} center={center}>
      <DirectionsRenderer directions={directions} />
    </GoogleMap>
  );
};

export default RouteMap;