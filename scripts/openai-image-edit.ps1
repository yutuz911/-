$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Net.Http

$stdin = [Console]::In.ReadToEnd()
$payload = $stdin | ConvertFrom-Json

$handler = [System.Net.Http.HttpClientHandler]::new()
$handler.UseProxy = $true
$handler.Proxy = [System.Net.WebRequest]::DefaultWebProxy
$handler.DefaultProxyCredentials = [System.Net.CredentialCache]::DefaultCredentials

$client = [System.Net.Http.HttpClient]::new($handler)
$client.Timeout = [TimeSpan]::FromSeconds(180)
$client.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new("Bearer", $env:OPENAI_API_KEY)

$form = [System.Net.Http.MultipartFormDataContent]::new()
$form.Add([System.Net.Http.StringContent]::new([string]$payload.model), "model")
$form.Add([System.Net.Http.StringContent]::new([string]$payload.prompt), "prompt")
$form.Add([System.Net.Http.StringContent]::new([string]$payload.size), "size")
$form.Add([System.Net.Http.StringContent]::new([string]$payload.quality), "quality")
$form.Add([System.Net.Http.StringContent]::new([string]$payload.moderation), "moderation")
$form.Add([System.Net.Http.StringContent]::new([string]$payload.output_format), "output_format")

$bytes = [Convert]::FromBase64String([string]$payload.image_base64)
$imageContent = [System.Net.Http.ByteArrayContent]::new($bytes)
$imageContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse([string]$payload.mime)
$form.Add($imageContent, "image[]", [string]$payload.filename)

$response = $client.PostAsync("https://api.openai.com/v1/images/edits", $form).GetAwaiter().GetResult()
$body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()

$result = [pscustomobject]@{
  status = [int]$response.StatusCode
  body = $body
}

[Console]::Out.Write(($result | ConvertTo-Json -Compress))
