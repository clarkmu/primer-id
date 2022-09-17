import React from "react";
import Button from "@/components/form/Button";
import Alert from "@/components/form/Alert";
import Input from "@/components/form/Input";

function List() {
  const [password, setPassword] = React.useState("");
  const [data, setData] = React.useState([]);
  const [error, setError] = React.useState("");

  const onSubmit = async () => {
    setError("");
    try {
      const data = await (
        await await fetch(`/api/tcsdr/list`, {
          method: "POST",
          body: JSON.stringify({ password }),
        })
      ).json();

      if (data.error) {
        setError(error);
      } else {
        setData(data);
      }
    } catch (e) {
      setError("Network error");
    }
  };

  return data.length > 0 && typeof data === "object" ? (
    <table className="table-auto">
      <th>
        <tr>
          {["Email", "Date", "Type", "State", "Primer Count", "ID"].map(
            (header) => (
              <td key={header}>{header}</td>
            )
          )}
        </tr>
      </th>
      <tbody>
        {data.map((row) => (
          <tr key={row._id}>
            <td>{row.email}</td>
            <td>{new Date(row.createdAt).toLocaleDateString("en-US")}</td>
            <td>{row.htsf ? "HTSF" : row.dropbox ? "DropBox" : "Upload"}</td>
            <td>
              {row.submit ? "Submitted" : row.pending ? "Pending" : "Complete"}
            </td>
            <td>
              {row.primers && row.primers.length > 0
                ? row.primers.length
                : "DR"}
            </td>
            <td>{row._id}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ) : (
    <div className="flex flex-col gap-4">
      <Input
        fullWidth
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <Button fullWidth onClick={onSubmit}>
        Log In
      </Button>
      <Alert msg={error} />
    </div>
  );
}

export default List;
