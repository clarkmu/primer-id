import { TCSDRState } from "@/components/TCSDR/Form";
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useState,
} from "react";

export enum ParamTypes {
  JSON = "Use Existing Params",
  NEW = "Start Your Run",
}

export const TCSContext = createContext<
  | {
      state: TCSDRState;
      setState: React.Dispatch<React.SetStateAction<TCSDRState>>;
      stepForward: () => void;
      procedure: ParamTypes;
      setProcedure: Dispatch<SetStateAction<ParamTypes>>;
      expandedPrimer: number;
      setExpandedPrimer: Dispatch<SetStateAction<number>>;
    }
  | undefined
>(undefined);

export const useTCS = () => {
  const context = useContext(TCSContext);
  if (!context) {
    throw new Error("useTCS must be used within a TCSContextProvider");
  }
  return context;
};

export default function TCSContextProvider({
  children,
  state,
  setState,
  stepForward,
}: {
  children: ReactNode;
  state: TCSDRState;
  setState: Dispatch<SetStateAction<TCSDRState>>;
  stepForward: () => void;
}) {
  const [procedure, setProcedure] = useState<ParamTypes>(ParamTypes.NEW);
  const [expandedPrimer, setExpandedPrimer] = useState<number>(0);

  return (
    <TCSContext.Provider
      value={{
        state,
        setState,
        stepForward,
        procedure,
        setProcedure,
        expandedPrimer,
        setExpandedPrimer,
      }}
    >
      {children}
    </TCSContext.Provider>
  );
}
