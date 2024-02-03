import { ReactNode, useEffect } from "react";
import { useNavigation } from "react-router-dom";

export function Header(): ReactNode {
  const navigation = useNavigation();
  useEffect(() => {
    //
  }, [navigation, navigation.location]);
  return <b>HEADER</b>;
}
