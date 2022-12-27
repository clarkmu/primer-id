<?php

/**
 * script through an ogv submission from submission to returning results
 *
 * group job files at an id directory
 * run snakemake with path to id dir
 *
 * wait for processing
 *
 * if done (last step of snakemake files same as count input files)
 *    forward results to user
 *
 */

/**
 * missing steps between Docker and here:
 *   conda init bash
 *   conda activate snakemake
 *   gcloud auth activate-service-account --key-file /home/node/app/storage-admin.json
 *
 * maybe make this a script that runs separately from this?  Will that make it work in this shell?
 * does not work running these commands in Pipeline::init
 */

//note - run this INSIDE of the docker container on local
$IS_DEV = ! empty($argv[1]);
$TILDA = "/home/node/app/ogv-server";

$ADMIN_EMAIL = "clarkmu@email.unc.edu";
$WEBSITE_URL = $IS_DEV ? "host.docker.internal:3000" : "https://primer-id.org";
$API_URL = "$WEBSITE_URL/api/ogv";
$BASE = $IS_DEV ? "$TILDA/ogv-submissions" : "/proj/swanslab/RUBY-PHP-LONGLEAF/var/run";
$LOCK_FILE = $IS_DEV ? "$BASE/locked-ogv-dating" : "$BASE/locked-ogv-dating";

$PRIVATE_KEY_FILE = $IS_DEV ? "$TILDA/storage-admin.json" : "$BASE/storage-admin.json";

$SCRATCH_SPACE = $IS_DEV ? $BASE : "/pine/scr/r/c/rc_swans.svc/ogv-dating";

$LOG_DIR = $IS_DEV ? $BASE : "$BASE/output/ogv-dating";

$BUCKET_URL = "gs://ogv-dating";

if( $IS_DEV ){
    shell_exec("mkdir -p $BASE");

    if(file_exists($LOCK_FILE)){
        echo "LOCK FILE EXISTED";
        unlink($LOCK_FILE);
    }

    if( strpos(shell_exec("gsutil -v"), "gsutil version") === false ){
        exit("Error: Missing gsutil in bash\n");
    }
}

$mailLocation = $IS_DEV ? "$TILDA/mail.php" : "$BASE/mail.php";

require $mailLocation;

if( file_exists($LOCK_FILE) ){
	exit;
}

touch($LOCK_FILE);

try{
	$pipelines = shell_exec("curl $API_URL");
    $pipelines = json_decode($pipelines, true);
}catch(Exception $e){
	$pipelines = [];
}

if( is_array($pipelines) && empty($pipelines['error']) ){
    foreach( $pipelines as $p ){
        $pipeline = new Pipeline($p);

        try{
             if( $pipeline->isFirstRun ){
                $pipeline->mlog("PRE INIT PIPELINE ID {$pipeline->id}");
                $pipeline->init();
                $pipeline->mlog("POST INIT PIPELINE ID {$pipeline->id}");
            }else if( $pipeline->hasProcessed ){
                $pipeline->mlog("PRE HAS_PROCESSED ID {$pipeline->id}");
                $pipeline->mailResults();
                $pipeline->mlog("POST HAS_PROCESSED ID {$pipeline->id}");
            }else{
                if(!$IS_DEV){
                    $pipeline->checkForFail();
                }
            }
        }catch(Exception $e){
            $pipeline->addError("PIPELINE PROCESSING ERROR:\n$e\n" . var_export($p,true), false);
        }
    }
}

unlink($LOCK_FILE);

class Pipeline {

    function __construct($data){
        $this->id = $data['_id'];
        $this->data = $data;

        /**
         * directories specific to this run
         * dir is main scratch dir that holds all files for this run
         * job dir is the input
         * logDir is the processing output
         */
        $this->dir = "{$GLOBALS['SCRATCH_SPACE']}/{$this->id}";
        $this->jobDir = "{$this->dir}/data";
        $this->logDir = "{$GLOBALS['LOG_DIR']}/{$this->id}";
        $this->slurmJobName = "ogv_{$this->id}";
        $this->slurmOutput = "{$GLOBALS['LOG_DIR']}/{$this->id}.output";

        $this->isFirstRun = $data['submit'] && !$data['pending'];
        $this->hasProcessed = $data['pending'] && $this->processingFinished();
    }

    public function init(){
        $this->command("mkdir -p {$this->jobDir}");

        $this->command("mkdir -p {$this->logDir}");

        if( ! $GLOBALS['IS_DEV'] && ! $this->mailReceipt() ){
            echo "No email";
            return;
        }

        $this->transferUploadedJobs();

        $this->generateSamplesFile();

        $cores = 4 * max([1, count($this->data['conversion'])]);

        $cmd = "snakemake --cores $cores --config job_dir=\"{$this->dir}\"";

        if( $GLOBALS['IS_DEV'] ){
            $this->command($cmd);
        }else{
            $cmd .= " --keep-going --snakefile {$GLOBALS["BASE"]}/Snakefile";
            $this->command("sbatch -o {$this->slurmOutput} -n $cores --job-name=\"{$this->slurmJobName}\" --mem=20000 -t 1440 --wrap=\"{$cmd}\"");
        }

        $this->patchPipeline([
            "submit" => false,
            "pending" => true
        ]);
    }

    private function generateSamplesFile(){
        $samplesFileLocation = "{$this->dir}/samples.json";

        if(file_exists($samplesFileLocation)){
            return;
        }

        $samplesJSON = [
            "samples" => []
         ];

        foreach($this->data['uploads'] as $upload){
            array_push(
                $samplesJSON['samples'],
                "{$upload['libName']}/{$upload['fileName']}"
            );
        }

        $samplesJSON = json_encode($samplesJSON);

        $this->command("echo '{$samplesJSON}' > $samplesFileLocation");
    }

    private function processingFinished(){
        return count(glob("{$this->dir}/results/dating/*/*.csv")) === count($this->data['uploads']);
    }

    private function patchPipeline($data){
        $json = json_encode([
            "_id" => $this->id,
            "patch" => $data
        ]);
        $this->command(
            "curl --request PATCH {$GLOBALS['API_URL']} " .
            '-H "Content-Type: application/json" '.
            "--data '{$json}'"
        );
    }

    private function transferUploadedJobs(){

        // if(count(glob("{$this->jobDir}/*"))){
        //     return;
        // }

        $dev = $GLOBALS['IS_DEV'] ? "dev/" : "";

        $this->command("gsutil cp -r {$GLOBALS["BUCKET_URL"]}/$dev{$this->id}/* {$this->jobDir}");

        if( ! count(glob("{$this->jobDir}/*")) ){
            $this->addError("File uploads missing.  Check GCP credentials.  Uploaded files are held for 7 days.  Job ID: {$this->id}");
        }
    }

    private function generateReceipt($message, $link = ""){

        $receipt = "";

        if ( ! empty($this->data['uploads']) ) {
            $receipt .= "<u>Uploaded Files</u>:<br>";
            foreach($this->data['uploads'] as $f){
                $receipt .= $f['fileName'] . "<br>";
            }
            $receipt .= "<br>";
        }

        $receipt .= "<br><br>";

        $receipt = "<html><body>" .
            "Dear Primer-ID WebApp user,<br>" .
            "Thank you for using our WebApp.<br><br>" .
            "{{add_message}}" .
            $receipt .
            "{{file_download}}" .
            "If you have any questions, feel free to <a href=\"{$GLOBALS['WEBSITE_URL']}/contact/\">contact us</a>.<br>" .
            "Primer-ID team @UNC" .
            "</body></html>";

        $receipt = str_replace("{{add_message}}", $message, $receipt);

        $receipt = str_replace("{{file_download}}", $link, $receipt);

        return $receipt;
    }

    private function mailReceipt(){
        $email = new PHPMailer();
        $email->isHTML(true);
        $email->FromName = "SwansLabWeb";
        $email->SetFrom($GLOBALS["ADMIN_EMAIL"], "SwanLabWeb");
        $email->Subject = "OGV-Dating Submission";
        $email->AddAddress( $this->data['email'] );
        $email->AddAddress($GLOBALS["ADMIN_EMAIL"]);

        $email->Body = $this->generateReceipt("Processing time varies by submission but should take around 30 minutes per submission.<br><br>");

        return $email->Send();
    }

    private function processConversion(){
        $conversion = $this->data['conversion'];

        if(!$conversion || !count($conversion)){
            // return;
            $conversion = [];
        }

        $conversionJSON = [];
        $inputLocation = "{$this->dir}/conversion.json";
        $outputLocation = "{$this->dir}/results/summary.csv";

        foreach($conversion as $key => $value){
            $conversionJSON[$key] = [
                "Start2ART" => intval($value),
                "colors" => (object)[]
            ];
        }

        file_put_contents($inputLocation, json_encode($conversionJSON));

        $scriptLocation = $GLOBALS['IS_DEV'] ? "{$GLOBALS['TILDA']}/result-summary.py" : "{$GLOBALS['BASE']}/result-summary.py";
        $this->command("python3 $scriptLocation -d {$this->dir}/results/dating/ -j $inputLocation -o $outputLocation");
    }

    public function mailResults(){

        $this->processConversion();

        $error = "";

        $extension = $this->data['resultsFormat'] === "tar" ? ".tar.gz" : ".zip";
        $resultsID = !empty($this->data['jobID']) ? $this->data['jobID'] : $this->id;
        $fileName = "ogv-results_{$resultsID}";
        $compressedFileName = "$fileName{$extension}";

        $location = "{$this->dir}/{$compressedFileName}";
        $dev = $GLOBALS["IS_DEV"] ? "dev/" : "";
        $gsLocation = "{$GLOBALS['BUCKET_URL']}/{$dev}{$this->id}/{$compressedFileName}";

        if(file_exists($location)){
            $this->command("rm $location");
        }

        if($this->data['resultsFormat'] === "zip"){
            $this->command("cd {$this->dir} && mv results $fileName && zip -r $compressedFileName $fileName && cd -");
        }else{
            $this->command("tar -zcvf $location -C {$this->dir}/results .");
        }

        $this->command("gsutil cp $location $gsLocation");
        $this->command("rm $location");

        $signedURL = $this->command("gsutil signurl -d 7d {$GLOBALS['PRIVATE_KEY_FILE']} $gsLocation");

        $signedURL = strstr($signedURL, 'https://');

        $expiration = date('m/d/Y', strtotime('+7 days'));

        $downloadLink = "<a href='$signedURL' style='font-size: 18px;'>Download Results</a>" .
            "<br>" .
            "<small>The following links expire $expiration</small>";

        if( $this->getFile("error") ){

            if( $error ){

                $error .= "<br><br>";
            }

            $error .= file_get_contents("{$this->dir}/error");
        }

        if( $error ){

            $error = "<div style='color: lightcoral; padding: 5px; font-weight: bold;'>" . $error . "</div><br>";
        }

        $email = new PHPMailer();
        $email->isHTML(true);
        $email->SetFrom($GLOBALS["ADMIN_EMAIL"], "SwanLabWeb");
        $email->Subject = "OGV-Dating Results";
        $email->AddAddress($this->data['email']);
        $email->Body = $this->generateReceipt($downloadLink."<br><br>", $error);
        $email->Send();

        $this->patchPipeline([
            "pending" => false
        ]);
    }

    public function checkForFail(){
        $jobStatus = $this->command("sacct --name {$this->slurmJobName}");
        if( strpos($jobStatus, "FAILED") !== FALSE ){
            $this->addError(
                "This OGV-Dating submission has failed. The error output is available below.</br></br>" .
                file_get_contents($this->slurmOutput),
                false
            );
        }else{
            $this->mlog("NO ACTION FOR PIPELINE ID {$this->id}");
        }
    }

    private function getFile($fileName, $set = false){

        if( $set )  $this->command("touch {$this->dir}/$fileName");
        else        return file_exists("{$this->dir}/$fileName");
    }

    public function addError($msg, $throw = true){

        $email = new PHPMailer();
        $email->isHTML(true);
        $email->SetFrom($GLOBALS["ADMIN_EMAIL"], "SwanLabWeb");
        $email->Subject = "OGV-Dating ERROR";
        $email->AddAddress($GLOBALS["ADMIN_EMAIL"]);
        $email->AddAddress($this->data['email']);

        $email->Body = $msg;
        $email->Send();

        $this->patchPipeline([
            "processingError" => true
        ]);

        if($throw){
            $this->mlog("Error: \n\n$msg", true);
            throw new Exception("Error Processing Request", 1);
        }
    }

    public function mlog($msg, $error = false){

        $output = $GLOBALS['LOG_DIR'];

        // `mkdir -p {$this->logDir}`;

        $date = date("D M d, Y G:i");
        shell_exec("echo '[$date] $msg\n' >> $output/message_log");
        shell_exec("echo '[$date] $msg\n' >> {$this->logDir}/message_log");
        if( $error ){
            shell_exec("echo '[$date] $msg\n' >> $output/error_log");
            shell_exec("echo '[$date] $msg\n' >> {$this->logDir}/error_log");
        }
        echo $msg . "\n\n";
    }

    private function command($cmd, $decode = false){

        $this->mlog($cmd);
        $se = shell_exec($cmd);
        return $decode ? json_decode($se, true) : $se;
    }
}

?>