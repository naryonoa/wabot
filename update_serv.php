<?php
require('helper/koneksi.php');
session_start();
$sess = $_SESSION['username'];
$slek = mysqli_query($koneksi, "SELECT * FROM account WHERE username = '$sess'");
$data = mysqli_fetch_assoc($slek);
$slek2 = mysqli_query($koneksi, "SELECT * FROM required WHERE id = '1'");
$data2 = mysqli_fetch_assoc($slek2);
if (isset($_POST['login'])) {
    $username = $_POST['username'];
    $password = sha1($_POST['password']);
    $cek = mysqli_query($koneksi, "SELECT * FROM account WHERE username = '$username' AND password = '$password'");
    if (mysqli_num_rows($cek) == 1) {
        $_SESSION['username'] = $username;
        die("<script>window.location.href = '';</script>");
    } else {
        echo '<script>alert("username atau password salah");</script>';
    }
}
if ($data['level'] == 2) {
    die("<script>window.location.href= 'pages/home.php';</script>");
}
if (isset($_POST['updateserver'])) {
$serv_key = $_POST['serv_key'];
$domain = $_POST['domain'];
$update = mysqli_query($koneksi, "UPDATE required SET serv_key = '$serv_key' WHERE id ='1'");
$update .= mysqli_query($koneksi, "UPDATE required SET domain = '$domain' WHERE id ='1'");
echo '<script>window.location.href= "";</script>';
}
if ($_SESSION['username']) { ?>
<html>
    <head>
        <title>Update server</title>
    </head>
    <body>
        <center><h1 style="color: Tomato;">Adm panel sederhana</h1>
        <br>
        <form action="" method="POST">
            <input type="text" name="serv_key" value="<?php echo $data2['serv_key'];?>" placeholder="Server_key">
            <br>
            <input type="text" name="domain" value="<?php echo $data2['domain'];?>" placeholder="Url">
            <br>
            <button type="submit" name="updateserver">Update</button>
        </form>
        </cnter>
    </body>
</html>
<?php } else { ?>
<html>
    <head>
        <title>Login</title>
    </head>
    <body>
        <center><h1 style="color: Tomato;">Login to continuce</h1>
        <br>
        <form action="" method="POST">
            <input type="text" name="username" placeholder="Username">
            <br>
            <input type="password" name="password" placeholder="Password">
            <br>
            <button type="submit" name="login">login</button>
        </form>
        </cnter>
    </body>
</html>
<?php } ?>