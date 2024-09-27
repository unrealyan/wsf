import { RouteSectionProps } from "@solidjs/router/dist/types";
import ErrorMessage from "./components/alertBar/error";
import { StoreType, useStore } from "./lib/store";

export default function App (props:RouteSectionProps){
  const [state,action]:StoreType = useStore()
  return <>
    {props.children}
    <ErrorMessage type={state.alertMsg?.type} message={state.alertMsg?.message}/>
  </>
}