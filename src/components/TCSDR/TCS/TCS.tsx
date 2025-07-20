import PrimersContainer from "./PrimersContainer";
import UseJSON from "./UseJSON";
import MyCollapse from "@/components/form/MyCollapse";
import Button from "@/components/form/Button";
import Paper from "@/components/form/Paper";
import GlobalSettings from "./GlobalSettings";
import SavedPrimers from "./SavedPrimers";
import { ParamTypes, useTCS } from "@/contexts/TCSContext";

export default function TCSContainer() {
  const { procedure, setProcedure } = useTCS();

  return (
    <Paper>
      <div className="flex flex-col gap-6">
        <div className="font-xl text-xl w-full text-center">Parameters</div>
        <div className="flex justify-around gap-8 mx-8">
          {[ParamTypes.NEW, ParamTypes.JSON].map((p, i) => (
            <Button
              data-cy={`form_procedure_${
                p === ParamTypes.NEW ? "manual" : "json"
              }`}
              key={`form_procedure_${p}`}
              color="secondary"
              variant={procedure === p ? "primary" : "outlined"}
              onClick={() => setProcedure(p)}
              fullWidth
            >
              {p}
            </Button>
          ))}
        </div>
        <MyCollapse show={procedure === ParamTypes.JSON}>
          <UseJSON />
        </MyCollapse>
        <MyCollapse show={procedure === ParamTypes.NEW}>
          <div className="flex flex-col gap-4">
            <GlobalSettings />
            <SavedPrimers />
            <PrimersContainer />
          </div>
        </MyCollapse>
      </div>
    </Paper>
  );
}
