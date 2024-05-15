import React, { useState } from "react";
import PrimersContainer from "./PrimersContainer";
import UseJSON from "./UseJSON";
import MyCollapse from "@/components/form/MyCollapse";
import Button from "@/components/form/Button";
import Paper from "@/components/form/Paper";
import Collapse from "@/components/form/Collapse";

enum ParamTypes {
  JSON = "Use Existing Params",
  NEW = "Start Your Run",
}

export default function TCSContainer() {
  const [procedure, setProcedure] = useState(ParamTypes.NEW);

  return (
    <Paper>
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <div className="font-xl text-xl">Parameters</div>
        </div>
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
        <Collapse open={!!procedure}>
          <div>
            <MyCollapse show={procedure === ParamTypes.JSON}>
              <UseJSON />
            </MyCollapse>
          </div>
          <MyCollapse show={procedure === ParamTypes.NEW}>
            <div>
              <PrimersContainer />
            </div>
          </MyCollapse>
        </Collapse>
      </div>
    </Paper>
  );
}
