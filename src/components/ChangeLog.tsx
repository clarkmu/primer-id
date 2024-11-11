type ChangeLog = {
  date: String;
  body: String;
};

export const changeLogList: ChangeLog[] = [
  {
    date: "November 2024",
    body: "Upgrade implemented for faster turnaround times. Emails with processing errors will have better end-user descriptions.",
  },
  {
    date: "May 2024",
    body: "TCS pipeline can save amplicons to computer for later use.  Use the checkbox labeled 'Save amplicons for later use on this computer.' under 'Start Your Run'. ",
  },
  {
    date: "January 2024",
    body: "Dropbox has been removed as a way to upload sequences to all pipelines due to changing requirements.",
  },
];

export const Log = ({ log }: { log: ChangeLog }) => (
  <span className="text-base">
    <span className="font-bold">{log["date"]} - </span>
    {log["body"]}
  </span>
);

export default function ChangeLog() {
  return (
    <div className="flex flex-col gap-6 divide-y-2">
      <div className="font-bolder text-xl">Change Log</div>
      {changeLogList.map((log, i) => (
        <span key={`change_log_${i}`} className="pt-3">
          <Log log={log} />
        </span>
      ))}
    </div>
  );
}
